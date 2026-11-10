"use client";

import type {
  VoiceCallControls,
  VoiceCallPeer,
  VoiceCallPhase,
} from "@/lib/voice/voice-call.types";
import { VoiceCallScreen } from "@/components/voice/VoiceCallScreen";
import { VoiceCallFloatingBubble } from "@/components/voice/VoiceCallFloatingBubble";

interface VoiceCallActiveOverlayProps {
  peer: VoiceCallPeer;
  phase: VoiceCallPhase;
  elapsedSec: number;
  controls: VoiceCallControls;
  isMinimized: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onMinimize: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
}

/** 通話中のフルスクリーン UI と最小化バブル */
export function VoiceCallActiveOverlay({
  peer,
  phase,
  elapsedSec,
  controls,
  isMinimized,
  isExpanded,
  onExpand,
  onMinimize,
  onToggleMute,
  onEndCall,
}: VoiceCallActiveOverlayProps) {
  return (
    <>
      {isMinimized && (
        <VoiceCallFloatingBubble
          peer={peer}
          phase={phase}
          elapsedSec={elapsedSec}
          onExpand={onExpand}
        />
      )}
      {isExpanded && (
        <VoiceCallScreen
          phase={phase}
          peer={peer}
          elapsedSec={elapsedSec}
          controls={controls}
          onToggleMute={onToggleMute}
          onEndCall={onEndCall}
          onMinimize={onMinimize}
        />
      )}
    </>
  );
}
