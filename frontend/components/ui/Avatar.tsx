/**
 * アバターコンポーネント
 */

import { memo } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  src?: string;
  alt: string;
  name: string;
  size?: "sm" | "md" | "list" | "lg" | "xl";
  type?: "human" | "ai";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  list: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  list: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-10 h-10",
};

export const Avatar = memo(function Avatar({
  src,
  alt,
  name,
  size = "md",
  type = "human",
  className,
}: AvatarProps) {
  const isAI = type === "ai";

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
              size === "list" && "text-base",
              size === "lg" && "text-lg",
              size === "xl" && "text-2xl"
            )}
          >
            {name.charAt(0)}
          </span>
        )}
      </div>
    </div>
  );
});
