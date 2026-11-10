"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  VoiceCallPeer,
  VoiceCallPhase,
} from "@/lib/voice/voice-call.types";
import {
  formatVoiceCallDuration,
  voiceCallStatusText,
} from "@/lib/voice/voice-call.types";

const AVATAR_SIZE_PX = 128;
/** 呼び出しリングがはみ出しても切れない外枠（アバターと同心） */
const RING_STAGE_PX = Math.round(AVATAR_SIZE_PX * 1.45);

interface VoiceCallPeerDisplayProps {
  peer: VoiceCallPeer;
  phase: VoiceCallPhase;
  elapsedSec: number;
}

function CenteredRing({
  sizePx,
  className,
}: {
  sizePx: number;
  className?: string;
}) {
  return (
    <div
      className="flex absolute inset-0 justify-center items-center pointer-events-none"
      aria-hidden
    >
      <span
        className={cn("rounded-full", className)}
        style={{ width: sizePx, height: sizePx }}
      />
    </div>
  );
}

/**
 * 通話画面用ピア表示（チャット用 Avatar は使わない）
 * アバター位置はフェーズに依存しない（上下 flex で中央 + 下テキスト枠の高さ固定）
 */
export function VoiceCallPeerDisplay({
  peer,
  phase,
  elapsedSec,
}: VoiceCallPeerDisplayProps) {
  const isRinging = phase === "outgoing" || phase === "connecting";
  const showTimer = phase === "connected";
  const statusText = voiceCallStatusText(phase);

  return (
    <div className="flex flex-col flex-1 items-center self-center px-6 mx-auto w-full max-w-md min-h-0">
      <div className="flex-[1.06] min-h-4 w-full" aria-hidden />
      <div className="flex flex-col items-center w-full shrink-0">
        <div
          className="relative mx-auto mb-4 shrink-0"
          style={{ width: RING_STAGE_PX, height: RING_STAGE_PX }}
        >
          {isRinging && (
            <>
              <CenteredRing
                sizePx={Math.round(AVATAR_SIZE_PX * 1.32)}
                className="animate-ping origin-center bg-emerald-400/35"
              />
              <CenteredRing
                sizePx={Math.round(AVATAR_SIZE_PX * 1.18)}
                className="animate-pulse origin-center bg-emerald-500/25"
              />
            </>
          )}
          {phase === "connected" && (
            <CenteredRing
              sizePx={Math.round(AVATAR_SIZE_PX * 1.06)}
              className="animate-pulse origin-center bg-emerald-500/10"
            />
          )}

          <div className="flex absolute inset-0 z-10 justify-center items-center">
            <div
              className={cn(
                "overflow-hidden rounded-full ring-4 shrink-0",
                isRinging ? "ring-emerald-400/50" : "ring-white/20",
              )}
              style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX }}
            >
              {peer.avatar_url ? (
                <img
                  src={peer.avatar_url}
                  alt={peer.name}
                  className="object-cover object-center w-full h-full"
                />
              ) : (
                <div className="flex justify-center items-center w-full h-full bg-gradient-to-br from-green-400 to-blue-500">
                  <Bot className="w-12 h-12 text-white" aria-hidden />
                </div>
              )}
            </div>
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-center text-white">
          {peer.name}
        </h1>

        {/* フェーズ切替でブロック高さが変わらないよう固定枠 */}
        <div className="flex flex-col justify-start items-center w-full min-h-[4.25rem]">
          {showTimer ? (
            <p className="font-mono text-lg tabular-nums text-center text-emerald-200/90">
              {formatVoiceCallDuration(elapsedSec)}
            </p>
          ) : (
            <p className="text-base text-center text-white/75">{statusText}</p>
          )}
          <p
            className={cn(
              "mt-2 text-sm text-center text-white/50",
              !showTimer && "invisible",
            )}
            aria-hidden={!showTimer}
          >
            音声通話（デモ）
          </p>
        </div>
      </div>
      <div className="flex-1 w-full min-h-4" aria-hidden />
    </div>
  );
}
