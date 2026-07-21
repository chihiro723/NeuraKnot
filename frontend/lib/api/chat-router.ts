/**
 * チャット送信ルーター（クラウド / ブラウザローカルのハイブリッド）
 *
 * 1回の POST /conversations/:id/messages で、サーバーは応答形式を切り替える:
 *   - text/event-stream  : サーバー(Python)ストリーミング推論（従来どおり）
 *   - JSON {runtime:client}: ブラウザ(WebLLM)ローカル推論の材料
 *   - JSON (通常)         : サーバー非ストリーミング推論（従来どおり）
 *
 * この関数は既存の `sendMessageStream`（lib/api/streaming.ts）と同一の
 * onEvent / onError / StreamEvent インターフェースを保つため、
 * 呼び出し側（AIChatWindow）のイベントハンドラをそのまま流用できる。
 */
import type { StreamEvent } from '@/lib/types'
import type {
  MLCEngineInterface,
  ChatCompletionMessageParam,
} from '@mlc-ai/web-llm'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ||
  'http://localhost:8080'

// サーバーが client-runtime 時に返す推論材料
interface ClientInferencePayload {
  runtime: 'client'
  user_message: { id: string; content: string }
  system_prompt: string
  messages: Array<{ role: string; content: string }>
  provider: string
  model: string
  temperature: number
  max_tokens: number
  agent_name: string
}

// ローカル推論に必要なフック（AIChatWindow が LocalLLMContext から供給）
export interface LocalRuntimeHooks {
  // 指定モデルをロード済みにしてエンジンを返す（未ロードならダウンロード）
  ensureEngine: (model: string) => Promise<MLCEngineInterface>
}

/**
 * メッセージを送信する。サーバー応答に応じてクラウド/ローカルを自動で振り分ける。
 */
export async function sendChatMessage(
  conversationId: string,
  content: string,
  accessToken: string | null,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void,
  local?: LocalRuntimeHooks
) {
  try {
    const token =
      accessToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('access_token')
        : null)

    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(
      `${BACKEND_URL}/api/v1/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ content }),
      }
    )

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to send message' }))
      const errorMsg = `[${response.status}] ${
        error.message || error.error || 'メッセージの送信に失敗しました'
      }`
      console.error('Chat request failed:', errorMsg)
      onError(errorMsg)
      return
    }

    const contentType = response.headers.get('content-type')

    // --- サーバーストリーミング（従来経路） ---
    if (contentType?.includes('text/event-stream')) {
      await parseServerSSE(response, onEvent, onError)
      return
    }

    // --- JSON 応答 ---
    const data = await response.json()

    // クライアント(WebLLM)ローカル推論
    if (data && data.runtime === 'client') {
      await runLocalInference(
        conversationId,
        data as ClientInferencePayload,
        token,
        onEvent,
        onError,
        local
      )
      return
    }

    // サーバー非ストリーミング（従来経路）: user_message + ai_message
    if (data?.ai_message?.content !== undefined) {
      onEvent({ type: 'token', content: data.ai_message.content })
      onEvent({ type: 'done' })
      return
    }

    // 想定外のレスポンス
    onError('サーバーから予期しない応答を受信しました')
  } catch (error) {
    console.error('Send chat message error:', error)
    onError(
      'メッセージの送信に失敗しました: ' +
        (error instanceof Error ? error.message : String(error))
    )
  }
}

/**
 * サーバー SSE ストリームをパースして onEvent に流す。
 */
async function parseServerSSE(
  response: Response,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void
) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  if (!reader) {
    onError('レスポンスの読み込みに失敗しました')
    return
  }

  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6)
        if (dataStr.trim()) {
          try {
            const event = JSON.parse(dataStr)
            onEvent(event)
            if (event.type === 'error' || event.type === 'done') {
              return
            }
          } catch (e) {
            console.error('Failed to parse SSE event:', e, 'data:', dataStr)
          }
        }
      }
    }
  }
}

/**
 * ブラウザ(WebLLM)でローカル推論を実行し、結果をサーバーに保存する。
 */
async function runLocalInference(
  conversationId: string,
  payload: ClientInferencePayload,
  token: string | null,
  onEvent: (event: StreamEvent) => void,
  onError: (error: string) => void,
  local?: LocalRuntimeHooks
) {
  if (!local) {
    onError('ローカル実行の準備ができていません（エンジン未初期化）')
    return
  }

  const startedAt = Date.now()

  try {
    const engine = await local.ensureEngine(payload.model)

    // ローカルモデルはコンテキスト枠が小さい（例: 4096）ため、履歴が長いと
    // プロンプトだけで枠を超える。最新側から件数を絞りつつ、超過時はさらに
    // 履歴を減らしてリトライする（トークン送出前に失敗するため二重描画はしない）。
    const history = payload.messages
    // 最新の1件（通常は今回のユーザー発言）は必ず残す
    let keep = Math.min(history.length, MAX_LOCAL_HISTORY_MESSAGES)

    let full = ''
    let promptTokens = 0
    let completionTokens = 0
    let succeeded = false

    while (!succeeded) {
      const trimmed = keep >= history.length ? history : history.slice(-keep)
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: payload.system_prompt },
        ...trimmed.map(
          (m): ChatCompletionMessageParam =>
            m.role === 'assistant'
              ? { role: 'assistant', content: m.content }
              : { role: 'user', content: m.content }
        ),
      ]

      try {
        const chunks = await engine.chat.completions.create({
          messages,
          // 小型ローカルモデルは同じ語を無限反復する degeneration を起こしやすい。
          // 反復ペナルティ類で抑制する（クラウドの大型モデルでは不要な調整）。
          temperature: clampLocalTemperature(payload.temperature),
          top_p: 0.9,
          frequency_penalty: 0.6,
          presence_penalty: 0.3,
          repetition_penalty: 1.15,
          max_tokens: payload.max_tokens,
          stream: true,
          stream_options: { include_usage: true },
        })

        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content || ''
          if (delta) {
            full += delta
            onEvent({ type: 'token', content: delta })
          }
          // 最終チャンクに usage が含まれる（include_usage: true）
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens || 0
            completionTokens = chunk.usage.completion_tokens || 0
          }
        }
        succeeded = true
      } catch (err) {
        // コンテキスト超過かつ、まだトークンを1つも出していない場合のみ履歴を削ってリトライ
        if (isContextWindowError(err) && full === '' && keep > 1) {
          keep = Math.max(1, Math.floor(keep / 2))
          console.warn(
            `ローカル推論: コンテキスト超過のため履歴を ${keep} 件に削減して再試行します`
          )
          continue
        }
        throw err
      }
    }

    // 生成結果をサーバーに保存（課金は $0）
    await persistLocalResult(
      conversationId,
      full,
      promptTokens,
      completionTokens,
      Date.now() - startedAt,
      token
    )

    onEvent({ type: 'done' })
  } catch (error) {
    console.error('Local inference error:', error)
    onError(
      'ローカル推論に失敗しました: ' +
        (error instanceof Error ? error.message : String(error))
    )
  }
}

// ローカル推論で最初に渡す履歴件数の上限。クラウド経路（サーバー側 limit=20）と揃える。
// コンテキスト超過は生成前のトークン計算で検知できるため、まず 20 件で試し、
// 収まらなければ動的に半減リトライして「入る範囲で最大限の履歴」を使う。
const MAX_LOCAL_HISTORY_MESSAGES = 20

/**
 * ローカル小型モデル向けに temperature を安全域へ収める。
 * 低すぎる(≒0)と決定的に反復ループしやすく、高すぎると崩壊しやすいため。
 */
function clampLocalTemperature(temperature: number): number {
  if (!Number.isFinite(temperature)) return 0.7
  return Math.min(1.0, Math.max(0.5, temperature))
}

/**
 * WebLLM のコンテキストウィンドウ超過エラーかどうかを判定する。
 */
function isContextWindowError(error: unknown): boolean {
  const name = (error as { name?: string })?.name || ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    name === 'ContextWindowSizeExceededError' ||
    /context window size|prompt tokens exceed/i.test(message)
  )
}

/**
 * ローカル推論結果をサーバー(Go)に保存する。
 */
async function persistLocalResult(
  conversationId: string,
  content: string,
  promptTokens: number,
  completionTokens: number,
  processingTimeMs: number,
  token: string | null
) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(
    `${BACKEND_URL}/api/v1/conversations/${conversationId}/messages/complete`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        content,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        processing_time_ms: processingTimeMs,
      }),
    }
  )

  if (!res.ok) {
    // 保存に失敗しても生成結果は画面に表示済み。ログに記録して続行。
    console.error(
      'Failed to persist local inference result:',
      res.status,
      await res.text().catch(() => '')
    )
  }
}
