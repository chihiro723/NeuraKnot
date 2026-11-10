/**
 * 音声通話 UI の型定義（モック / 将来 Realtime 差し替え用）
 */

export type VoiceCallPhase =
  | "idle"
  | "outgoing"
  | "connecting"
  | "connected";

export type VoiceCallPeer = {
  name: string;
  avatar_url?: string;
  type: "ai";
};

export type VoiceCallControls = {
  isMuted: boolean;
};

export const DEFAULT_VOICE_CALL_CONTROLS: VoiceCallControls = {
  isMuted: false,
};

export const VOICE_CALL_MOCK_OUTGOING_MS = 1800;
export const VOICE_CALL_MOCK_CONNECTING_MS = 400;

export function formatVoiceCallDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function voiceCallPhaseLabel(phase: VoiceCallPhase): string {
  switch (phase) {
    case "idle":
      return "待機";
    case "outgoing":
      return "呼び出し中";
    case "connecting":
      return "接続中";
    case "connected":
      return "通話中";
    default:
      return phase;
  }
}

export function voiceCallStatusText(phase: VoiceCallPhase): string {
  switch (phase) {
    case "outgoing":
      return "呼び出し中…";
    case "connecting":
      return "接続中…";
    case "connected":
      return "通話中";
    default:
      return "";
  }
}

/** 最小化バブル下に表示する短いステータス */
export function voiceCallBubbleStatusLabel(
  phase: VoiceCallPhase,
  elapsedSec: number,
): string {
  switch (phase) {
    case "outgoing":
      return "発信中";
    case "connecting":
      return "接続中";
    case "connected":
      return formatVoiceCallDuration(elapsedSec);
    default:
      return "";
  }
}
