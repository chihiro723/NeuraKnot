import {
  Zap,
  Bot,
  Globe,
  Database,
  Mail,
  Calendar,
  Image,
  Video,
  Music,
  FileText,
  MapPin,
  ShoppingCart,
  CreditCard,
  Cloud,
  Code,
  Shield,
  Cpu,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * サービス名に基づいてアイコンを選択する関数
 * @param serviceName サービス名
 * @returns Lucide アイコンコンポーネント
 */
export const getServiceIcon = (serviceName: string): LucideIcon => {
  const name = serviceName.toLowerCase();

  return Zap;
  if (
    name.includes("openai") ||
    name.includes("gpt") ||
    name.includes("chatgpt")
  )
    return Bot;
  // カレンダーは google より前にチェック（Google Calendar 対応）
  if (name.includes("calendar") || name.includes("schedule")) return Calendar;
  if (name.includes("google")) return Globe;
  if (
    name.includes("database") ||
    name.includes("sql") ||
    name.includes("postgres")
  )
    return Database;
  if (name.includes("email") || name.includes("mail")) return Mail;
  if (
    name.includes("image") ||
    name.includes("photo") ||
    name.includes("picture")
  )
    return Image;
  if (name.includes("video") || name.includes("youtube")) return Video;
  if (
    name.includes("music") ||
    name.includes("audio") ||
    name.includes("sound")
  )
    return Music;
  if (
    name.includes("file") ||
    name.includes("document") ||
    name.includes("pdf")
  )
    return FileText;
  if (name.includes("map") || name.includes("location") || name.includes("geo"))
    return MapPin;
  if (
    name.includes("shop") ||
    name.includes("commerce") ||
    name.includes("store")
  )
    return ShoppingCart;
  if (
    name.includes("payment") ||
    name.includes("stripe") ||
    name.includes("billing")
  )
    return CreditCard;
  if (
    name.includes("cloud") ||
    name.includes("storage") ||
    name.includes("aws")
  )
    return Cloud;
  if (name.includes("code") || name.includes("github") || name.includes("git"))
    return Code;
  if (
    name.includes("security") ||
    name.includes("auth") ||
    name.includes("login")
  )
    return Shield;
  if (
    name.includes("cpu") ||
    name.includes("compute") ||
    name.includes("processing")
  )
    return Cpu;
  if (
    name.includes("settings") ||
    name.includes("config") ||
    name.includes("admin")
  )
    return Settings;

  return Zap; // デフォルト（稲妻アイコン）
};

/**
 * サービス名に基づいてグラデーション色を選択する関数
 * @param serviceName サービス名
 * @returns Tailwind のグラデーションクラス名
 */
export const getServiceGradient = (serviceName: string): string => {
  const name = serviceName.toLowerCase();

  if (
    name.includes("openai") ||
    name.includes("gpt") ||
    name.includes("chatgpt")
  )
    return "from-emerald-500 to-teal-600";
  // カレンダーは google より前にチェック（Google Calendar 対応）
  if (name.includes("calendar") || name.includes("schedule"))
    return "from-slate-500 to-gray-600";
  if (name.includes("google")) return "from-blue-500 to-indigo-600";
  if (
    name.includes("database") ||
    name.includes("sql") ||
    name.includes("postgres")
  )
    return "from-purple-500 to-violet-600";
  if (name.includes("email") || name.includes("mail"))
    return "from-red-500 to-pink-600";
  if (
    name.includes("image") ||
    name.includes("photo") ||
    name.includes("picture")
  )
    return "from-rose-500 to-pink-600";
  if (name.includes("video") || name.includes("youtube"))
    return "from-red-500 to-rose-600";
  if (
    name.includes("music") ||
    name.includes("audio") ||
    name.includes("sound")
  )
    return "from-violet-500 to-purple-600";
  if (
    name.includes("file") ||
    name.includes("document") ||
    name.includes("pdf")
  )
    return "from-slate-500 to-gray-600";
  if (name.includes("map") || name.includes("location") || name.includes("geo"))
    return "from-green-500 to-emerald-600";
  if (
    name.includes("shop") ||
    name.includes("commerce") ||
    name.includes("store")
  )
    return "from-yellow-500 to-orange-600";
  if (
    name.includes("payment") ||
    name.includes("stripe") ||
    name.includes("billing")
  )
    return "from-indigo-500 to-blue-600";
  if (
    name.includes("cloud") ||
    name.includes("storage") ||
    name.includes("aws")
  )
    return "from-cyan-500 to-blue-600";
  if (name.includes("code") || name.includes("github") || name.includes("git"))
    return "from-gray-500 to-slate-600";
  if (
    name.includes("security") ||
    name.includes("auth") ||
    name.includes("login")
  )
    return "from-red-500 to-orange-600";
  if (
    name.includes("cpu") ||
    name.includes("compute") ||
    name.includes("processing")
  )
    return "from-blue-500 to-cyan-600";
  if (
    name.includes("settings") ||
    name.includes("config") ||
    name.includes("admin")
  )
    return "from-gray-500 to-slate-600";

  return "from-slate-500 to-slate-600"; // デフォルト
};

