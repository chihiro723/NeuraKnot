/**
 * ローカル LLM (WebLLM) による補助機能。
 *
 * 質問候補生成を、ロード済みのローカルエンジンで実行する。
 * サーバー(クラウド)コストをかけずに動作させるのが狙い。
 * 失敗時（未ロード・パース失敗など）は呼び出し側でクラウド経路へフォールバックする。
 *
 * 注: プロンプト強化は品質確保のため常にクラウド固定モデルで実行する方針であり、
 *     ローカル版ヘルパは意図的に提供しない。
 */
import type { MLCEngineInterface } from "@mlc-ai/web-llm";

export interface SimpleMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * 会話履歴から、ユーザーが次に送りそうな質問・メッセージ候補をローカル生成する。
 * WebLLM の JSON 出力モード（response_format: json_object）で整形する。
 */
export async function generateSuggestionsLocal(
  engine: MLCEngineInterface,
  recentMessages: SimpleMessage[],
  count = 3
): Promise<string[]> {
  const convText = recentMessages
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
    .join("\n");

  const system =
    "あなたは会話の流れを踏まえて、ユーザーが次にAIへ送りそうな短いメッセージ候補を提案するアシスタントです。必ず指定のJSON形式のみを出力し、余計な説明は書かないでください。";
  const user =
    `以下は会話の履歴です。\n\n${convText || "(まだ会話がありません)"}\n\n` +
    `この続きとしてユーザーが送りそうな質問・メッセージ候補を${count}個、` +
    `それぞれ40文字以内の自然な日本語で提案してください。\n` +
    `出力は {"suggestions": ["候補1", "候補2", "候補3"]} という JSON オブジェクトのみ。`;

  const res = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
    stream: false,
  });

  const content = res.choices[0]?.message?.content || ""
  const parsed = JSON.parse(content) as unknown;
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as { suggestions?: unknown }).suggestions;

  if (!Array.isArray(arr)) {
    throw new Error("invalid suggestions format");
  }

  const result = arr
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((x) => x.trim())
    .slice(0, count);

  if (result.length === 0) {
    throw new Error("no suggestions generated");
  }
  return result;
}
