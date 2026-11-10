"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import type {
  VoiceCallControls,
  VoiceCallPeer,
  VoiceCallPhase,
} from "@/lib/voice/voice-call.types";
import { VoiceCallPeerDisplay } from "@/components/voice/VoiceCallPeerDisplay";
import { VoiceCallControlBar } from "@/components/voice/VoiceCallControlBar";

export interface VoiceCallScreenProps {
  phase: VoiceCallPhase;
  peer: VoiceCallPeer;
  elapsedSec: number;
  controls: VoiceCallControls;
  onToggleMute: () => void;
  onEndCall: () => void;
  onMinimize: () => void;
}

/**
 * LINE 風フルスクリーン音声通話 UI（モック / 将来 Realtime 接続）
 */
export function VoiceCallScreen({
  phase,
  peer,
  elapsedSec,
  controls,
  onToggleMute,
  onEndCall,
  onMinimize,
}: VoiceCallScreenProps) {
  const [mounted, setMounted] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-[#0d2818] via-[#0a1f14] to-[#050a08] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${peer.name}との音声通話`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent" />

      <div className="relative flex flex-col flex-1 items-center w-full min-h-0 min-w-0">
        <VoiceCallPeerDisplay
          peer={peer}
          phase={phase}
          elapsedSec={elapsedSec}
        />
        <VoiceCallControlBar
          phase={phase}
          controls={controls}
          onToggleMute={onToggleMute}
          onMinimize={onMinimize}
          onEndCall={onEndCall}
        />
      </div>
    </div>,
    document.body,
  );
}
