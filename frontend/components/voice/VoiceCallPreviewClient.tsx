"use client";

import { useState } from "react";
import { useMockVoiceCall } from "@/lib/hooks/useMockVoiceCall";
import type {
  VoiceCallPhase,
  VoiceCallPeer,
} from "@/lib/voice/voice-call.types";
import { voiceCallPhaseLabel } from "@/lib/voice/voice-call.types";
import { VoiceCallActiveOverlay } from "@/components/voice/VoiceCallActiveOverlay";
import { cn } from "@/lib/utils/cn";

const PREVIEW_PEER: VoiceCallPeer = {
  name: "デモアシスタント",
  type: "ai",
};

const PHASES: VoiceCallPhase[] = [
  "idle",
  "outgoing",
  "connecting",
  "connected",
];

/**
 * 研究会・開発用: 通話 UI の全フェーズを手動またはモック自動遷移で確認する
 */
export function VoiceCallPreviewClient() {
  const [useAutoFlow, setUseAutoFlow] = useState(true);
  const mockAuto = useMockVoiceCall();
  const mockManual = useMockVoiceCall({ disableAutoTransition: true });
  const active = useAutoFlow ? mockAuto : mockManual;

  const {
    phase,
    elapsedSec,
    controls,
    isActive,
    isMinimized,
    isExpanded,
    startCall,
    endCall,
    minimize,
    expand,
    toggleMute,
    setPhaseForPreview,
    goIdle,
  } = active;

  const handleToggleFlow = (next: boolean) => {
    setUseAutoFlow(next);
    mockAuto.goIdle();
    mockManual.goIdle();
  };

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          音声通話 UI プレビュー
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          API 未接続のモックです。オーバーレイの見た目と状態遷移を確認できます。
        </p>
      </div>

      <div className="p-6 space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          フロー
        </h2>
        <label className="flex gap-3 items-center text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={useAutoFlow}
            onChange={(e) => handleToggleFlow(e.target.checked)}
            className="rounded border-gray-300"
          />
          モック自動遷移（呼び出し → 接続 → 通話）
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => startCall()}
            disabled={phase !== "idle"}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40"
          >
            通話を開始
          </button>
          <button
            type="button"
            onClick={() => goIdle()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
          >
            リセット（idle）
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          現在のフェーズ:{" "}
          <span className="font-mono font-medium">{phase}</span>
          {isMinimized ? (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              （最小化中）
            </span>
          ) : null}
        </p>
      </div>

      {!useAutoFlow && (
        <div className="p-6 space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            フェーズを手動切替
          </h2>
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhaseForPreview(p)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                  phase === p
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
                )}
              >
                {voiceCallPhaseLabel(p)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isActive && (
        <VoiceCallActiveOverlay
          peer={PREVIEW_PEER}
          phase={phase}
          elapsedSec={elapsedSec}
          controls={controls}
          isMinimized={isMinimized}
          isExpanded={isExpanded}
          onExpand={expand}
          onMinimize={minimize}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      )}
    </div>
  );
}
