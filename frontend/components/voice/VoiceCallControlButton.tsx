"use client";

import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type Variant = "side" | "dangerLarge";

interface VoiceCallControlButtonProps {
  /** アクセシビリティ用（画面には表示しない） */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: Variant;
  ariaPressed?: boolean;
  className?: string;
  disabled?: boolean;
}

const buttonVariantClasses: Record<Variant, string> = {
  side: "bg-white/15 hover:bg-white/25 text-white border border-white/10",
  dangerLarge:
    "bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-950/50 ring-2 ring-red-300/25 hover:ring-red-200/35",
};

/** 中央(80px)を超えない副ボタン（64px） */
const buttonSizeClasses: Record<Variant, string> = {
  side: "w-16 h-16 sm:w-[4.25rem] sm:h-[4.25rem]",
  dangerLarge: "w-[4.75rem] h-[4.75rem] sm:w-20 sm:h-20",
};

const iconSizeClasses: Record<Variant, string> = {
  side: "[&_svg]:w-[1.65rem] [&_svg]:h-[1.65rem] sm:[&_svg]:w-7 sm:[&_svg]:h-7",
  dangerLarge:
    "[&_svg]:w-[1.85rem] [&_svg]:h-[1.85rem] sm:[&_svg]:w-9 sm:[&_svg]:h-9",
};

export function VoiceCallControlButton({
  label,
  icon,
  onClick,
  variant = "side",
  ariaPressed,
  className,
  disabled = false,
}: VoiceCallControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={ariaPressed}
      aria-hidden={disabled ? true : undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "flex shrink-0 justify-center items-center rounded-full",
        "transition-[background-color,box-shadow,transform] duration-200 active:scale-95",
        "disabled:pointer-events-none",
        buttonSizeClasses[variant],
        buttonVariantClasses[variant],
        className,
      )}
    >
      <span
        className={cn(
          "flex justify-center items-center [&_svg]:shrink-0",
          iconSizeClasses[variant],
        )}
      >
        {icon}
      </span>
    </button>
  );
}
