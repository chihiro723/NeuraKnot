"use client";

import { useVoiceCall } from "@/lib/contexts/VoiceCallContext";
import { VoiceCallActiveOverlay } from "@/components/voice/VoiceCallActiveOverlay";

/** ダッシュボード全体で通話 UI を保持 */
export function VoiceCallHost() {
  const {
    phase,
    elapsedSec,
    controls,
    peer,
    isActive,
    isMinimized,
    isExpanded,
    endCall,
    minimize,
    expand,
    toggleMute,
  } = useVoiceCall();

  if (!isActive || !peer) return null;

  return (
    <VoiceCallActiveOverlay
      peer={peer}
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
  );
}
