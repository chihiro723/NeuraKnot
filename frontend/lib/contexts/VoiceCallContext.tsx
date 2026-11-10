"use client";

// TODO: replace mock with OpenAI Realtime WebSocket session

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  VoiceCallControls,
  VoiceCallPeer,
  VoiceCallPhase,
} from "@/lib/voice/voice-call.types";
import {
  DEFAULT_VOICE_CALL_CONTROLS,
  VOICE_CALL_MOCK_CONNECTING_MS,
  VOICE_CALL_MOCK_OUTGOING_MS,
} from "@/lib/voice/voice-call.types";

type VoiceCallContextValue = {
  phase: VoiceCallPhase;
  elapsedSec: number;
  controls: VoiceCallControls;
  peer: VoiceCallPeer | null;
  agentId: string | null;
  isActive: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  startCall: (peer: VoiceCallPeer, agentId: string) => void;
  endCall: () => void;
  minimize: () => void;
  expand: () => void;
  toggleMute: () => void;
};

const VoiceCallContext = createContext<VoiceCallContextValue | undefined>(
  undefined,
);

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) {
    throw new Error("useVoiceCall must be used within VoiceCallProvider");
  }
  return ctx;
}

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<VoiceCallPhase>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [peer, setPeer] = useState<VoiceCallPeer | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [controls, setControls] = useState<VoiceCallControls>(
    DEFAULT_VOICE_CALL_CONTROLS,
  );

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
    setPeer(null);
    setAgentId(null);
    setIsMinimized(false);
    setControls(DEFAULT_VOICE_CALL_CONTROLS);
  }, [clearAllTimers]);

  const startCall = useCallback(
    (nextPeer: VoiceCallPeer, nextAgentId: string) => {
      if (phase !== "idle") return;
      clearAllTimers();
      setPeer(nextPeer);
      setAgentId(nextAgentId);
      setIsMinimized(false);
      setControls(DEFAULT_VOICE_CALL_CONTROLS);
      setElapsedSec(0);
      setPhase("outgoing");

      outgoingTimerRef.current = setTimeout(() => {
        setPhase("connecting");
        connectingTimerRef.current = setTimeout(() => {
          setPhase("connected");
          startTick();
        }, VOICE_CALL_MOCK_CONNECTING_MS);
      }, VOICE_CALL_MOCK_OUTGOING_MS);
    },
    [phase, clearAllTimers, startTick],
  );

  const endCall = useCallback(() => {
    if (phase === "idle") return;
    stopTick();
    goIdle();
  }, [phase, goIdle, stopTick]);

  const minimize = useCallback(() => {
    if (phase === "idle") return;
    setIsMinimized(true);
  }, [phase]);

  const expand = useCallback(() => {
    if (phase === "idle") return;
    setIsMinimized(false);
  }, [phase]);

  const toggleMute = useCallback(() => {
    setControls((c) => ({ ...c, isMuted: !c.isMuted }));
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const isActive = phase !== "idle";
  const isExpanded = isActive && !isMinimized;

  return (
    <VoiceCallContext.Provider
      value={{
        phase,
        elapsedSec,
        controls,
        peer,
        agentId,
        isActive,
        isMinimized,
        isExpanded,
        startCall,
        endCall,
        minimize,
        expand,
        toggleMute,
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
}
