/**
 * アバターコンポーネント
 */

import { memo } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  src?: string;
  alt: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  type?: "human" | "ai";
  status?: "online" | "offline" | "away";
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const statusSizeClasses = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
  xl: "w-6 h-6",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-6 h-6",
  xl: "w-10 h-10",
};

export const Avatar = memo(function Avatar({
  src,
  alt,
  name,
  size = "md",
  type = "human",
  status,
  showStatus = false,
  className,
}: AvatarProps) {
  const isAI = type === "ai";
  const isOnline = status === "online";

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden",
          isAI && "bg-gradient-to-br from-green-400 to-blue-500",
          sizeClasses[size]
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="object-cover w-full h-full" />
        ) : isAI ? (
          <Bot className={cn("text-white", iconSizeClasses[size])} />
        ) : (
          <span
            className={cn(
              "text-white font-medium",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-lg",
              size === "xl" && "text-2xl"
            )}
          >
            {name.charAt(0)}
          </span>
        )}
      </div>

      {/* ステータスインジケーター */}
      {showStatus && status && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full border-2 border-white dark:border-gray-800",
            statusSizeClasses[size],
            isOnline
              ? "bg-green-500"
              : status === "away"
              ? "bg-yellow-500"
              : "bg-gray-400",
            isOnline && "animate-pulse"
          )}
        ></div>
      )}

      {/* AIバッジ */}
      {isAI && size !== "sm" && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800",
            size === "md" && "w-4 h-4",
            size === "lg" && "w-5 h-5",
            size === "xl" && "w-6 h-6"
          )}
        >
          <span
            className={cn(
              "text-white",
              size === "md" && "text-xs",
              size === "lg" && "text-sm",
              size === "xl" && "text-base"
            )}
          >
            🤖
          </span>
        </div>
      )}
    </div>
  );
});
