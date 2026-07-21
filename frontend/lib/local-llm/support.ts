/**
 * ブラウザローカル LLM (WebLLM) のサポート判定ユーティリティ
 *
 * WebLLM は WebGPU を必須とする。WebGPU は Chrome/Edge 113+ で安定、
 * Firefox は 141+(Win)/147+(macOS) で出荷、Safari は 26 で対応予定（2026年7月時点で未対応）。
 * そのため「使う前に必ずサポート判定し、非対応ならクラウドへ誘導する」設計が必須。
 */

export type WebGPUSupport = {
  supported: boolean
  /** 非対応時のユーザー向け理由メッセージ */
  reason?: string
}

/**
 * 現在のブラウザが WebGPU（＝WebLLM）をサポートしているか判定する。
 *
 * `navigator.gpu` の存在確認に加え、実際にアダプタを取得できるかまで確認する。
 * アダプタ取得は非同期なので Promise を返す。
 */
export async function checkWebGPUSupport(): Promise<WebGPUSupport> {
  if (typeof navigator === "undefined") {
    return { supported: false, reason: "サーバー環境では利用できません" }
  }

  // @ts-expect-error: navigator.gpu は WebGPU 型が無い環境でも参照する
  const gpu = navigator.gpu as GPU | undefined
  if (!gpu) {
    return {
      supported: false,
      reason:
        "お使いのブラウザは WebGPU に対応していません。Chrome / Edge の最新版をご利用ください。",
    }
  }

  try {
    const adapter = await gpu.requestAdapter()
    if (!adapter) {
      return {
        supported: false,
        reason:
          "WebGPU アダプタを取得できませんでした。GPU ドライバやブラウザ設定をご確認ください。",
      }
    }
    return { supported: true }
  } catch (e) {
    return {
      supported: false,
      reason:
        "WebGPU の初期化中にエラーが発生しました: " +
        (e instanceof Error ? e.message : String(e)),
    }
  }
}

/**
 * 同期的な簡易判定（`navigator.gpu` の有無のみ）。
 * UI の初期描画で「非対応の可能性」を素早く判定したい場合に使う。
 * 厳密な判定は checkWebGPUSupport を使うこと。
 */
export function hasWebGPUObject(): boolean {
  if (typeof navigator === "undefined") return false
  // @ts-expect-error: WebGPU 型が無い環境でも参照する
  return Boolean(navigator.gpu)
}
