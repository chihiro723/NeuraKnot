"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  voiceCallBubbleStatusLabel,
  type VoiceCallPeer,
  type VoiceCallPhase,
} from "@/lib/voice/voice-call.types";
import { cn } from "@/lib/utils/cn";

const BUBBLE_SIZE = 64;
const EDGE_MARGIN = 12;
const DRAG_THRESHOLD_PX = 6;

interface VoiceCallFloatingBubbleProps {
  peer: VoiceCallPeer;
  phase: VoiceCallPhase;
  elapsedSec: number;
  onExpand: () => void;
}

function getDefaultPosition(): { x: number; y: number } {
  const safeTop =
    typeof window !== "undefined"
      ? Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--voice-call-safe-top",
          ),
        ) || 0
      : 0;
  const top = EDGE_MARGIN + safeTop;
  const x = window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN;
  return { x, y: top };
}

function clampPosition(x: number, y: number) {
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, y), maxY),
  };
}

/**
 * 最小化中のフローティング通話バブル（初期位置は右上・ドラッグで移動）
 */
export function VoiceCallFloatingBubble({
  peer,
  phase,
  elapsedSec,
  onExpand,
}: VoiceCallFloatingBubbleProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef({
    pointerId: null as number | null,
    startClientX: 0,
    startClientY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const dragListenersRef = useRef<{
    move: (ev: PointerEvent) => void;
    up: (ev: PointerEvent) => void;
    cancel: (ev: PointerEvent) => void;
  } | null>(null);

  const removeDragListeners = () => {
    const listeners = dragListenersRef.current;
    if (!listeners) return;
    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.up);
    window.removeEventListener("pointercancel", listeners.cancel);
    dragListenersRef.current = null;
  };

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const syncSafeTop = () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const safeTop = probe.offsetHeight;
      probe.remove();
      document.documentElement.style.setProperty(
        "--voice-call-safe-top",
        `${safeTop}px`,
      );
    };
    syncSafeTop();
    const onResize = () => {
      syncSafeTop();
      setPosition((prev) => {
        const base = prev ?? getDefaultPosition();
        return clampPosition(base.x, base.y);
      });
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [mounted]);

  useEffect(() => {
    return () => {
      removeDragListeners();
    };
  }, []);

  const endDragSession = (
    pointerId: number,
    expandIfTap: boolean,
    target: EventTarget | null,
  ) => {
    if (dragRef.current.pointerId !== pointerId) return;

    const wasTap = !dragRef.current.moved;
    dragRef.current.pointerId = null;
    setIsDragging(false);

    if (
      target instanceof Element &&
      target.hasPointerCapture(pointerId)
    ) {
      target.releasePointerCapture(pointerId);
    }

    if (expandIfTap && wasTap) onExpand();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = positionRef.current?.x ?? rect.left;
    const y = positionRef.current?.y ?? rect.top;
    const nextPos = { x, y };
    setPosition(nextPos);
    positionRef.current = nextPos;

    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: x,
      originY: y,
      moved: false,
    };

    el.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (dragRef.current.pointerId !== ev.pointerId) return;
      const dx = ev.clientX - dragRef.current.startClientX;
      const dy = ev.clientY - dragRef.current.startClientY;
      if (
        !dragRef.current.moved &&
        Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
      ) {
        dragRef.current.moved = true;
        setIsDragging(true);
      }
      if (!dragRef.current.moved) return;
      ev.preventDefault();
      const clamped = clampPosition(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy,
      );
      positionRef.current = clamped;
      setPosition(clamped);
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (dragRef.current.pointerId !== ev.pointerId) return;
      removeDragListeners();
      endDragSession(ev.pointerId, true, el);
    };

    const onPointerCancel = (ev: PointerEvent) => {
      if (dragRef.current.pointerId !== ev.pointerId) return;
      removeDragListeners();
      endDragSession(ev.pointerId, false, el);
    };

    removeDragListeners();
    dragListenersRef.current = {
      move: onPointerMove,
      up: onPointerUp,
      cancel: onPointerCancel,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  };

  const statusLabel = voiceCallBubbleStatusLabel(phase, elapsedSec);

  if (!mounted) return null;

  const useExplicitPosition = position !== null;

  return createPortal(
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        "fixed z-[95] touch-none select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        !useExplicitPosition &&
          "right-3 top-[max(0.75rem,env(safe-area-inset-top))]",
      )}
      style={{
        touchAction: "none",
        ...(useExplicitPosition && position
          ? {
              left: position.x,
              top: position.y,
              width: BUBBLE_SIZE,
              height: BUBBLE_SIZE,
            }
          : { width: BUBBLE_SIZE, height: BUBBLE_SIZE }),
      }}
      aria-label="通話画面を開く。ドラッグで位置を変更できます"
    >
      <span
        className={cn(
          "relative flex h-full w-full items-center justify-center rounded-full",
          "bg-gradient-to-br from-[#0d2818] to-[#0a1f14]",
          "shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-2 ring-emerald-500/50",
          phase === "connected" && "ring-emerald-400/80",
          isDragging ? "scale-105" : "active:scale-95",
        )}
      >
        {phase === "connected" && (
          <span
            className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping pointer-events-none"
            aria-hidden
          />
        )}
        <span className="overflow-hidden relative z-10 w-[3.25rem] h-[3.25rem] rounded-full ring-2 ring-white/20 pointer-events-none">
          {peer.avatar_url ? (
            <img
              src={peer.avatar_url}
              alt=""
              draggable={false}
              className="object-cover w-full h-full pointer-events-none select-none"
            />
          ) : (
            <span className="block w-full h-full bg-gradient-to-br from-green-400 to-blue-500" />
          )}
        </span>
        {statusLabel ? (
          <span className="absolute -bottom-1 left-1/2 z-20 px-1.5 py-0.5 max-w-[5.5rem] text-[10px] font-medium text-white truncate whitespace-nowrap rounded-full -translate-x-1/2 bg-black/70 tabular-nums pointer-events-none">
            {statusLabel}
          </span>
        ) : null}
      </span>
    </button>,
    document.body,
  );
}
