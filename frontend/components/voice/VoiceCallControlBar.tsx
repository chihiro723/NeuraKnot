"use client";

import type { ReactNode } from "react";
import { DoorOpen, Mic, MicOff, Phone } from "lucide-react";
import type {
  VoiceCallControls,
  VoiceCallPhase,
} from "@/lib/voice/voice-call.types";
import { VoiceCallControlButton } from "@/components/voice/VoiceCallControlButton";
import { cn } from "@/lib/utils/cn";

interface VoiceCallControlBarProps {
  phase: VoiceCallPhase;
  controls: VoiceCallControls;
  onToggleMute: () => void;
  onMinimize: () => void;
  onEndCall: () => void;
}

const SIDE_BUTTON_LIFT = "mb-6 sm:mb-7";
const END_BUTTON_LIFT = "mb-10 sm:mb-12";

/** アイコン差し替えでガタつかない固定枠 */
function SideIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className="flex justify-center items-center w-[1.75rem] h-[1.75rem] sm:w-7 sm:h-7">
      {children}
    </span>
  );
}

export function VoiceCallControlBar({
  phase,
  controls,
  onToggleMute,
  onMinimize,
  onEndCall,
}: VoiceCallControlBarProps) {
  const isPreConnect = phase === "outgoing" || phase === "connecting";
  const endLabel = isPreConnect ? "キャンセル" : "通話終了";
  const sideActionsEnabled = phase === "connected";

  return (
    <div
      className={cn(
        "flex justify-center items-end mx-auto w-full max-w-lg min-h-[5.5rem] sm:min-h-[6rem] self-center",
        "px-6 pt-2",
        "pb-[max(2.5rem,env(safe-area-inset-bottom))]",
        "-translate-y-6 sm:-translate-y-8",
        "gap-11 sm:gap-14",
      )}
    >
      <VoiceCallControlButton
        label="アプリに戻る"
        variant="side"
        className={cn(SIDE_BUTTON_LIFT, !sideActionsEnabled && "invisible")}
        disabled={!sideActionsEnabled}
        icon={
          <SideIconSlot>
            <DoorOpen strokeWidth={2.1} />
          </SideIconSlot>
        }
        onClick={onMinimize}
      />
      <VoiceCallControlButton
        label={endLabel}
        variant="dangerLarge"
        className={END_BUTTON_LIFT}
        icon={<Phone className="rotate-[135deg]" strokeWidth={2.25} />}
        onClick={onEndCall}
      />
      <VoiceCallControlButton
        label={controls.isMuted ? "ミュート中" : "ミュート"}
        variant="side"
        className={cn(SIDE_BUTTON_LIFT, !sideActionsEnabled && "invisible")}
        disabled={!sideActionsEnabled}
        icon={
          <SideIconSlot>{controls.isMuted ? <MicOff /> : <Mic />}</SideIconSlot>
        }
        onClick={onToggleMute}
        ariaPressed={controls.isMuted}
      />
    </div>
  );
}
