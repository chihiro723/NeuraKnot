"use client";

// TODO: replace mock with OpenAI Realtime WebSocket session

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceCallControls, VoiceCallPhase } from "@/lib/voice/voice-call.types";
import {
  DEFAULT_VOICE_CALL_CONTROLS,
  VOICE_CALL_MOCK_CONNECTING_MS,
  VOICE_CALL_MOCK_OUTGOING_MS,
} from "@/lib/voice/voice-call.types";

export type UseMockVoiceCallOptions = {
  /** プレビューページ用: モック自動遷移を無効化 */
  disableAutoTransition?: boolean;
};

export function useMockVoiceCall(options: UseMockVoiceCallOptions = {}) {
  const { disableAutoTransition = false } = options;

  const [phase, setPhase] = useState<VoiceCallPhase>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [controls, setControls] = useState<VoiceCallControls>(
    DEFAULT_VOICE_CALL_CONTROLS,
  );
  const [isMinimized, setIsMinimized] = useState(false);

  const outgoingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (outgoingTimerRef.current) {
      clearTimeout(outgoingTimerRef.current);
      outgoingTimerRef.current = null;
    }
    if (connectingTimerRef.current) {
      clearTimeout(connectingTimerRef.current);
      connectingTimerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    setElapsedSec(0);
    tickRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
  }, [stopTick]);

  const goIdle = useCallback(() => {
    clearAllTimers();
    setPhase("idle");
    setElapsedSec(0);
    setIsMinimized(false);
    setControls(DEFAULT_VOICE_CALL_CONTROLS);
  }, [clearAllTimers]);

  const startCall = useCallback(() => {
    if (phase !== "idle") return;
    clearAllTimers();
    setControls(DEFAULT_VOICE_CALL_CONTROLS);
    setIsMinimized(false);
    setElapsedSec(0);
    setPhase("outgoing");

    if (disableAutoTransition) return;

    outgoingTimerRef.current = setTimeout(() => {
      setPhase("connecting");
      connectingTimerRef.current = setTimeout(() => {
        setPhase("connected");
        startTick();
      }, VOICE_CALL_MOCK_CONNECTING_MS);
    }, VOICE_CALL_MOCK_OUTGOING_MS);
  }, [phase, clearAllTimers, disableAutoTransition, startTick]);

  const endCall = useCallback(() => {
    if (phase === "idle") return;
    stopTick();
    goIdle();
  }, [phase, goIdle, stopTick]);

  const toggleMute = useCallback(() => {
    setControls((c) => ({ ...c, isMuted: !c.isMuted }));
  }, []);

  const minimize = useCallback(() => {
    if (phase === "idle") return;
    setIsMinimized(true);
  }, [phase]);

  const expand = useCallback(() => {
    if (phase === "idle") return;
    setIsMinimized(false);
  }, [phase]);

  /** プレビューページ用: フェーズを手動設定 */
  const setPhaseForPreview = useCallback(
    (next: VoiceCallPhase) => {
      clearAllTimers();
      setPhase(next);
      if (next === "connected") {
        startTick();
      } else {
        stopTick();
        if (next === "idle") {
          setElapsedSec(0);
          setIsMinimized(false);
          setControls(DEFAULT_VOICE_CALL_CONTROLS);
        }
      }
    },
    [clearAllTimers, startTick, stopTick],
  );

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const isActive = phase !== "idle";
  const isExpanded = isActive && !isMinimized;

  return {
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
  };
}
