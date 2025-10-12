"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Sparkles,
  Play,
  Pause,
  User,
  DoorOpen,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import type { AuthUser } from "@/lib/types/auth";
import type { UserProfile } from "@/lib/auth/server";
import { useCognitoAuth } from "@/lib/hooks/useCognitoAuth";

// 定数定義
const GRADIENT_THEMES = [
  { name: "default", gradient: "from-slate-900 via-slate-800 to-slate-900" },
  { name: "purple", gradient: "from-purple-900 via-slate-800 to-indigo-900" },
  { name: "emerald", gradient: "from-emerald-900 via-slate-800 to-cyan-900" },
  { name: "rose", gradient: "from-rose-900 via-slate-800 to-pink-900" },
  { name: "amber", gradient: "from-amber-900 via-slate-800 to-orange-900" },
];

const ACCENT_COLORS = [
  {
    primary: "rgba(52, 211, 153, 0.2)",
    secondary: "rgba(6, 182, 212, 0.2)",
    tertiary: "rgba(52, 211, 153, 0.1)",
  },
  {
    primary: "rgba(147, 51, 234, 0.2)",
    secondary: "rgba(99, 102, 241, 0.2)",
    tertiary: "rgba(139, 92, 246, 0.1)",
  },
  {
    primary: "rgba(52, 211, 153, 0.3)",
    secondary: "rgba(6, 182, 212, 0.3)",
    tertiary: "rgba(52, 211, 153, 0.15)",
  },
  {
    primary: "rgba(244, 63, 94, 0.2)",
    secondary: "rgba(236, 72, 153, 0.2)",
    tertiary: "rgba(251, 113, 133, 0.1)",
  },
  {
    primary: "rgba(245, 158, 11, 0.2)",
    secondary: "rgba(251, 146, 60, 0.2)",
    tertiary: "rgba(251, 191, 36, 0.1)",
  },
];

const NAV_LINKS = [
  { href: "#features", label: "機能", icon: Sparkles },
  { href: "#", label: "料金", icon: MessageCircle },
  { href: "#", label: "サポート", icon: User },
];

const SOCIAL_LINKS = [
  {
    name: "Twitter",
    href: "#",
    viewBox: "0 0 20 20",
    path: "M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84",
  },
  {
    name: "GitHub",
    href: "#",
    viewBox: "0 0 20 20",
    path: "M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z",
  },
  {
    name: "LinkedIn",
    href: "#",
    viewBox: "0 0 20 20",
    path: "M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z",
  },
  {
    name: "Discord",
    href: "#",
    viewBox: "0 0 20 20",
    path: "M16.942 4.556a16.3 16.3 0 0 0-4.126-1.3 12.04 12.04 0 0 0-.529 1.1 15.175 15.175 0 0 0-4.573 0 11.585 11.585 0 0 0-.535-1.1 16.274 16.274 0 0 0-4.129 1.3A17.392 17.392 0 0 0 .182 13.218a15.785 15.785 0 0 0 4.963 2.521c.41-.564.773-1.16 1.084-1.785a10.63 10.63 0 0 1-1.706-.83c.143-.106.283-.217.418-.33a11.664 11.664 0 0 0 10.118 0c.137.113.277.224.418.33-.544.328-1.116.606-1.71.832a12.52 12.52 0 0 0 1.084 1.785 16.46 16.46 0 0 0 5.064-2.595 17.286 17.286 0 0 0-2.973-8.662zM6.678 10.813a1.941 1.941 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.919 1.919 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045zm6.644 0a1.94 1.94 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.918 1.918 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045z",
  },
];

const STATS = [
  {
    value: 98,
    suffix: "%",
    label: "時間短縮",
    description: "日常タスクの自動化",
  },
  {
    value: 4000,
    suffix: "+",
    label: "サービス連携",
    description: "対応プラットフォーム",
  },
  {
    value: 24,
    suffix: "/7",
    label: "AI稼働",
    description: "休まないアシスタント",
  },
  { value: 99, suffix: "%", label: "満足度", description: "ユーザー評価" },
];

const SERVICES = [
  "Slack",
  "Gmail",
  "Calendar",
  "Drive",
  "Notion",
  "GitHub",
  "Figma",
  "Zoom",
];

interface LandingPageProps {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading?: boolean;
}

export function LandingPage({
  user,
  profile,
  isLoading = false,
}: LandingPageProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backgroundGradient, setBackgroundGradient] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const { signOut } = useCognitoAuth();
  const router = useRouter();

  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  // スクロール停止のメモ化されたハンドラー
  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    isScrollingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // 表示名を決定するヘルパー関数
  const getDisplayName = (): string => {
    if (!user || !profile) return "";
    return (
      profile.display_name ||
      profile.username ||
      user.email?.split("@")[0] ||
      "ユーザー"
    );
  };

  // スムーズスクロール実行（ネイティブAPIを活用）
  const executeAutoScroll = useCallback(() => {
    if (isAutoScrolling) {
      stopAutoScroll();
      return;
    }

    setIsAutoScrolling(true);
    isScrollingRef.current = true;

    const headerHeight = document.querySelector("nav")?.offsetHeight || 80;
    const viewportHeight = window.innerHeight;
    const target = viewportHeight - headerHeight;

    // より強いイージング効果のあるスクロール
    const startPosition = window.pageYOffset;
    const distance = target - startPosition;
    const duration = 1500; // 少し長めに設定
    const startTime = performance.now();

    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // 指数関数的減速
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1 && isScrollingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateScroll);
      } else {
        // 初期スクロール完了後に継続スクロール開始
        setTimeout(() => {
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;

          const continuousScroll = () => {
            if (!isScrollingRef.current) return;

            const current = window.pageYOffset;
            if (current >= maxScroll) {
              stopAutoScroll();
              return;
            }

            window.scrollBy(0, 1);
            timeoutRef.current = setTimeout(continuousScroll, 20);
          };

          if (window.pageYOffset < maxScroll && isScrollingRef.current) {
            continuousScroll();
          } else {
            stopAutoScroll();
          }
        }, 300);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, [isAutoScrolling, stopAutoScroll]);

  // 自動スクロールの停止処理
  useEffect(() => {
    if (!isAutoScrolling) return;

    const handleInteraction = (e: Event) => {
      const target = e.target as Element;
      if (target?.closest("[data-scroll-button]")) return;
      stopAutoScroll();
    };

    const events = [
      "wheel",
      "touchstart",
      "touchmove",
      "keydown",
      "click",
    ] as const;
    const options = { passive: true };

    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, options);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [isAutoScrolling, stopAutoScroll]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  // 時間経過による背景色の自動変更
  useEffect(() => {
    const intervalId = setInterval(() => {
      setBackgroundGradient((prev) => (prev + 1) % 5);
    }, 5000); // 5秒ごとに変更

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // スワイプで背景グラデーション変更
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;

      // 横スワイプで背景色変更
      if (Math.abs(deltaX) > 50) {
        setBackgroundGradient((prev) => (prev + 1) % 5);
      }

      setTouchStart(null);
    },
    [touchStart]
  );

  // ログアウト処理
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      // サインアウト処理を実行
      await signOut();

      // ホームページにリダイレクト
      router.push("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      // エラーが発生してもホームページにリダイレクト
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${GRADIENT_THEMES[backgroundGradient].gradient} relative overflow-hidden transition-all duration-1000 ease-out`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 動的背景装飾 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute left-10 top-20 w-32 h-32 rounded-full blur-3xl transition-all duration-1000"
          style={{ background: ACCENT_COLORS[backgroundGradient].primary }}
        />
        <div
          className="absolute right-10 bottom-20 w-40 h-40 rounded-full blur-3xl transition-all duration-1000"
          style={{ background: ACCENT_COLORS[backgroundGradient].secondary }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 transform -translate-x-1/2 -translate-y-1/2"
          style={{ background: ACCENT_COLORS[backgroundGradient].tertiary }}
        />
      </div>

      {/* ナビゲーション */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md bg-slate-900/90 border-white/10">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6">
          <div className="flex justify-between items-center">
            {/* ロゴ */}
            <Link href="/" className="flex z-20 items-center space-x-3">
              <div className="flex justify-center items-center w-8 h-8 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl sm:w-10 sm:h-10">
                <MessageCircle className="w-5 h-5 text-white sm:w-6 sm:h-6" />
              </div>
              <span className="text-lg font-bold text-white sm:text-xl">
                BridgeSpeak
              </span>
            </Link>

            {/* デスクトップ中央ナビゲーション */}
            <div className="hidden absolute left-1/2 items-center space-x-8 transform -translate-x-1/2 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-medium transition-colors text-slate-300 hover:text-emerald-400"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* デスクトップ右側アクション */}
            <div
              className="hidden items-center space-x-4 md:flex"
              data-mobile-menu
            >
              {!isLoading && user ? (
                <>
                  <div className="flex items-center px-4 py-2 space-x-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-emerald-300">
                      {getDisplayName()}
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg transition-colors hover:from-emerald-600 hover:to-cyan-600"
                  >
                    ダッシュボード
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex justify-center items-center w-10 h-10 rounded-lg border transition-all duration-300 bg-slate-700/50 hover:bg-red-500/20 border-slate-600/50 hover:border-red-500/50 group"
                    title="ログアウト"
                  >
                    <DoorOpen
                      className={`w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors ${
                        isLoggingOut ? "animate-pulse" : ""
                      }`}
                    />
                  </button>
                </>
              ) : !isLoading ? (
                <>
                  <Link
                    href="/auth/login"
                    className="font-medium transition-colors text-slate-300 hover:text-emerald-400"
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-2 font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg transition-colors hover:from-emerald-600 hover:to-cyan-600"
                  >
                    無料で始める
                  </Link>
                </>
              ) : null}
            </div>

            {/* モバイルハンバーガーメニュー */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative z-20 p-2 rounded-lg border backdrop-blur-sm transition-colors md:hidden bg-slate-800/80 border-slate-700/50 hover:bg-slate-700/80"
            >
              <div className="relative w-6 h-6">
                <Menu
                  className={`w-6 h-6 text-slate-300 absolute transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "opacity-0 rotate-180"
                      : "opacity-100 rotate-0"
                  }`}
                />
                <X
                  className={`w-6 h-6 text-slate-300 absolute transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "opacity-100 rotate-0"
                      : "opacity-0 -rotate-180"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* モバイルドロワーメニュー */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ease-out ${
          isMobileMenuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        data-mobile-menu
      >
        {/* オーバーレイ */}
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-all duration-300 ease-out ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* ドロワーコンテンツ */}
        <div
          className={`absolute right-0 top-0 h-full w-80 max-w-sm border-l border-emerald-500/20 shadow-2xl transform transition-all duration-500 ease-out ${
            isMobileMenuOpen
              ? "scale-100 translate-x-0"
              : "scale-95 translate-x-full"
          }`}
          style={{
            background:
              "linear-gradient(145deg, #1e293b 0%, #334155 50%, #1e293b 100%)",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(52, 211, 153, 0.1)",
          }}
        >
          <div className="flex flex-col h-full">
            {/* ヘッダー部分 - バツボタン */}
            <div
              className={`flex justify-between items-center p-6 border-b border-emerald-500/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm transition-all duration-700 delay-200 ${
                isMobileMenuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-4"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-8 h-8 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  メニュー
                </h2>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg border transition-all duration-300 bg-slate-700/30 hover:bg-red-500/20 border-slate-600/30 hover:border-red-500/30 group"
              >
                <X className="w-5 h-5 transition-colors text-slate-300 group-hover:text-red-400" />
              </button>
            </div>

            <div className="flex flex-col flex-1 px-6 pt-6">
              {/* ユーザー情報セクション */}
              {!isLoading && user && (
                <div
                  className={`mb-8 p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-cyan-500/15 border border-emerald-500/20 rounded-2xl backdrop-blur-sm transition-all duration-700 delay-300 ${
                    isMobileMenuOpen
                      ? "opacity-100 scale-100 translate-y-0"
                      : "opacity-0 scale-95 translate-y-4"
                  }`}
                  style={{
                    boxShadow:
                      "0 8px 32px rgba(52, 211, 153, 0.1), inset 0 1px 0 rgba(52, 211, 153, 0.2)",
                  }}
                >
                  <div className="flex items-center mb-5 space-x-4">
                    <div className="relative">
                      <div className="flex justify-center items-center w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl shadow-lg">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 animate-pulse border-slate-800"></div>
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 text-lg font-bold text-emerald-300">
                        {getDisplayName()}
                      </p>
                      <p className="text-sm truncate text-slate-400">
                        @{user.email?.split("@")[0] || "user"}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-5 py-3 w-full font-semibold text-center text-white bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-xl shadow-lg transition-all duration-300 transform hover:from-emerald-600 hover:via-emerald-500 hover:to-cyan-600 hover:shadow-emerald-500/25 hover:scale-105"
                  >
                    ダッシュボードへ移動
                  </Link>
                </div>
              )}

              {/* メニューアイテム */}
              <div className="mb-8 space-y-3">
                {NAV_LINKS.map((link, index) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center px-5 py-4 text-slate-300 hover:text-emerald-300 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-cyan-500/10 rounded-xl transition-all duration-300 font-medium border border-transparent hover:border-emerald-500/20 transform hover:scale-105 hover:translate-x-1 ${
                      isMobileMenuOpen
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4"
                    }`}
                    style={{ transitionDelay: `${400 + index * 100}ms` }}
                  >
                    <div className="flex justify-center items-center mr-4 w-10 h-10 rounded-lg transition-all duration-300 bg-slate-700/50 group-hover:bg-emerald-500/20">
                      <link.icon className="w-5 h-5 transition-colors duration-300 group-hover:text-emerald-400" />
                    </div>
                    <span className="transition-all duration-300 group-hover:font-semibold">
                      {link.label}
                    </span>
                  </a>
                ))}
              </div>

              {/* 認証アクション */}
              {!isLoading && !user && (
                <div className="mb-8 space-y-4">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full px-5 py-4 text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl transition-all duration-300 text-center border border-slate-600/30 hover:border-emerald-500/30 font-medium block transform hover:scale-105 ${
                      isMobileMenuOpen
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: "700ms" }}
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full px-5 py-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 hover:from-emerald-600 hover:via-emerald-500 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 text-center block shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105 ${
                      isMobileMenuOpen
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: "800ms" }}
                  >
                    無料で始める
                  </Link>
                </div>
              )}

              {/* ログアウトボタン */}
              {!isLoading && user && (
                <div
                  className={`mb-6 transition-all duration-700 delay-700 ${
                    isMobileMenuOpen
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                >
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isLoggingOut}
                    className="flex justify-center items-center px-5 py-4 w-full font-medium text-red-400 rounded-xl border shadow-lg transition-all duration-300 transform group bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40 hover:text-red-300 hover:scale-105 hover:shadow-red-500/25"
                  >
                    <div className="flex justify-center items-center mr-3 w-8 h-8 rounded-lg transition-all duration-300 bg-red-500/20 group-hover:bg-red-500/30">
                      <DoorOpen
                        className={`w-5 h-5 transition-all duration-300 ${
                          isLoggingOut ? "animate-pulse" : ""
                        }`}
                      />
                    </div>
                    <span className="transition-all duration-300 group-hover:font-semibold">
                      {isLoggingOut ? "ログアウト中..." : "ログアウト"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* フッター部分 */}
            <div
              className={`border-t border-emerald-500/10 p-6 bg-gradient-to-b from-slate-800/50 to-slate-900/80 backdrop-blur-sm transition-all duration-700 delay-900 ${
                isMobileMenuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              {/* SNSリンク */}
              <div className="flex justify-center mb-6 space-x-6">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="flex justify-center items-center w-10 h-10 rounded-lg transition-all duration-300 transform group bg-slate-700/30 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 hover:scale-110"
                    aria-label={social.name}
                  >
                    <svg
                      className="w-5 h-5 group-hover:animate-pulse"
                      fill="currentColor"
                      viewBox={social.viewBox}
                    >
                      <path
                        d={social.path}
                        fillRule={
                          social.name === "GitHub" || social.name === "LinkedIn"
                            ? "evenodd"
                            : undefined
                        }
                        clipRule={
                          social.name === "GitHub" || social.name === "LinkedIn"
                            ? "evenodd"
                            : undefined
                        }
                      />
                    </svg>
                  </a>
                ))}
              </div>

              {/* コピーライト */}
              <div className="text-center">
                <p className="mb-3 text-sm font-medium text-slate-400">
                  © 2024 BridgeSpeak. All rights reserved.
                </p>
                <div className="flex justify-center space-x-6 text-xs">
                  <a
                    href="#"
                    className="transition-all duration-300 text-slate-500 hover:text-emerald-400 hover:font-medium"
                  >
                    プライバシーポリシー
                  </a>
                  <a
                    href="#"
                    className="transition-all duration-300 text-slate-500 hover:text-emerald-400 hover:font-medium"
                  >
                    利用規約
                  </a>
                  <a
                    href="#"
                    className="transition-all duration-300 text-slate-500 hover:text-emerald-400 hover:font-medium"
                  >
                    ヘルプ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* エレガントなヒーローセクション */}
      <section className="flex overflow-hidden relative justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* 背景装飾 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-10 top-20 w-32 h-32 rounded-full blur-3xl bg-emerald-500/20"></div>
          <div className="absolute right-10 bottom-20 w-40 h-40 rounded-full blur-3xl bg-cyan-500/20"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 bg-emerald-400/10"></div>
        </div>

        {/* メインコンテンツ */}
        <div className="relative px-6 pt-16 mx-auto max-w-5xl text-center">
          {/* バッジ */}
          <div className="inline-flex items-center px-6 py-3 mb-8 font-medium text-emerald-300 rounded-full border backdrop-blur-sm bg-white/5 border-emerald-500/30">
            <Sparkles className="mr-3 w-5 h-5" />
            4,000以上のサービスと連携可能
          </div>

          {/* メインタイトル */}
          <h1 className="mb-8 text-5xl font-bold leading-tight md:text-7xl">
            <span className="text-white">あなたの</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              デジタル分身
            </span>
            <br />
            <span className="text-white">が誕生する</span>
          </h1>

          {/* サブタイトル */}
          <p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed md:text-2xl text-slate-300">
            AI革命の扉が、今開かれる
          </p>

          {/* CTAボタン */}
          <div className="flex flex-col gap-6 justify-center items-center mb-20 sm:flex-row">
            {!isLoading && user ? (
              <div className="text-center">
                <Link
                  href="/dashboard"
                  className="px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl shadow-2xl transition-all duration-300 transform hover:from-emerald-600 hover:via-emerald-500 hover:to-cyan-600 hover:scale-105 hover:shadow-emerald-500/30"
                >
                  ダッシュボードへ移動
                </Link>
              </div>
            ) : !isLoading ? (
              <Link
                href="/auth/signup"
                className="px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl shadow-2xl transition-all duration-300 transform hover:from-emerald-600 hover:via-emerald-500 hover:to-cyan-600 hover:scale-105 hover:shadow-emerald-500/30"
              >
                デジタル分身を今すぐ作成
              </Link>
            ) : (
              <div className="px-10 py-5 text-lg font-bold text-transparent bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl animate-pulse">
                読込中...
              </div>
            )}

            <button
              onClick={() => setIsVideoPlaying(!isVideoPlaying)}
              className="flex items-center px-8 py-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 text-slate-300 hover:text-white border-slate-600/50 hover:border-emerald-400/50 bg-white/5 hover:bg-white/10"
            >
              {isVideoPlaying ? (
                <Pause className="mr-3 w-5 h-5" />
              ) : (
                <Play className="mr-3 w-5 h-5" />
              )}
              <span className="font-medium">デモ動画を見る</span>
            </button>
          </div>

          {/* スクロール促進 */}
          <button
            data-scroll-button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              executeAutoScroll();
            }}
            className="flex flex-col justify-center items-center mx-auto opacity-80 transition-all duration-500 transform cursor-pointer group hover:opacity-100 hover:scale-110 active:scale-95 hover:-translate-y-2 touch-manipulation"
            style={{
              animation:
                "gentle-float 3s ease-in-out infinite, subtle-glow 2s ease-in-out infinite alternate",
            }}
          >
            <span className="mb-4 text-sm font-medium transition-colors duration-300 animate-pulse text-slate-300 group-hover:text-emerald-300 group-hover:animate-pulse">
              詳細を見る
            </span>
            <div className="relative">
              {/* モバイル版 - シェブロンダウンアイコン */}
              <div className="md:hidden">
                {/* 背景の輝きエフェクト */}
                <div className="absolute inset-0 w-12 h-12 rounded-full blur-md transition-all duration-300 animate-pulse bg-emerald-400/20 group-hover:bg-emerald-400/40"></div>

                {/* メインのシェブロンダウンアイコン */}
                <div className="flex relative justify-center items-center w-12 h-12 bg-gradient-to-b rounded-full border transition-all duration-300 from-emerald-500/20 to-cyan-500/20 group-hover:from-emerald-500/40 group-hover:to-cyan-500/40 border-emerald-400/30 group-hover:border-emerald-400/60">
                  <ChevronDown className="w-6 h-6 text-emerald-400 transition-colors duration-300 animate-bounce group-hover:text-emerald-300 group-hover:animate-pulse" />

                  {/* パルスエフェクト */}
                  <div className="absolute inset-0 w-12 h-12 rounded-full border opacity-40 animate-ping border-emerald-400/20 group-hover:opacity-70"></div>
                </div>
              </div>

              {/* デスクトップ版 - マウスアイコン */}
              <div className="hidden md:block">
                {/* 常時輝きエフェクト */}
                <div className="absolute inset-0 w-6 h-10 rounded-full blur-sm transition-all duration-300 animate-pulse bg-emerald-400/10 group-hover:bg-emerald-400/40 group-hover:blur-md"></div>

                {/* 常時回転する円形ボーダー */}
                <div
                  className="absolute inset-0 w-6 h-10 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent, rgba(52, 211, 153, 0.3), transparent)",
                    animation: "spin 4s linear infinite",
                  }}
                ></div>

                {/* メインのマウスアイコン */}
                <div className="flex relative justify-center w-6 h-10 bg-gradient-to-b rounded-full border-2 transition-all duration-300 border-emerald-400/40 group-hover:border-emerald-400/80 from-emerald-400/5 to-emerald-400/10 group-hover:to-emerald-400/20">
                  <div className="mt-2 w-1 h-3 bg-emerald-400 rounded-full transition-colors duration-300 animate-bounce group-hover:bg-emerald-300 group-hover:animate-pulse"></div>

                  {/* 常時パルスエフェクト */}
                  <div className="absolute inset-0 w-6 h-10 rounded-full border opacity-30 animate-ping border-emerald-400/30 group-hover:opacity-60"></div>
                </div>

                {/* 下向き矢印のヒント */}
                <div className="absolute -bottom-2 left-1/2 opacity-40 transition-opacity duration-300 animate-bounce transform -translate-x-1/2 group-hover:opacity-80">
                  <div className="w-0 h-0 border-r-2 border-l-2 border-transparent border-t-3 border-t-emerald-400/60"></div>
                </div>
              </div>
            </div>

            {/* 常時キラキラエフェクト */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-1/4 left-1/4 w-1 h-1 bg-emerald-400 rounded-full opacity-20 animate-ping group-hover:opacity-100"
                style={{ animation: "twinkle 3s ease-in-out infinite" }}
              ></div>
              <div
                className="absolute top-1/3 right-1/4 w-1 h-1 bg-cyan-400 rounded-full opacity-20 animate-ping group-hover:opacity-100"
                style={{ animation: "twinkle 3s ease-in-out infinite 1s" }}
              ></div>
              <div
                className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-emerald-300 rounded-full opacity-20 animate-ping group-hover:opacity-100"
                style={{ animation: "twinkle 3s ease-in-out infinite 2s" }}
              ></div>
            </div>

            {/* 常時浮遊する光の粒子 */}
            <div className="overflow-hidden absolute inset-0 pointer-events-none">
              <div
                className="absolute w-0.5 h-0.5 bg-emerald-400/40 rounded-full"
                style={{
                  animation: "float-particle-1 6s ease-in-out infinite",
                  top: "60%",
                  left: "20%",
                }}
              ></div>
              <div
                className="absolute w-0.5 h-0.5 bg-cyan-400/40 rounded-full"
                style={{
                  animation: "float-particle-2 5s ease-in-out infinite",
                  top: "40%",
                  right: "25%",
                }}
              ></div>
            </div>
          </button>

          <style jsx>{`
            @keyframes gentle-float {
              0%,
              100% {
                transform: translateY(0px);
              }
              50% {
                transform: translateY(-3px);
              }
            }

            @keyframes subtle-glow {
              0% {
                filter: drop-shadow(0 0 3px rgba(52, 211, 153, 0.1));
              }
              100% {
                filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.3));
              }
            }

            @keyframes twinkle {
              0%,
              100% {
                opacity: 0.2;
                transform: scale(1);
              }
              50% {
                opacity: 0.8;
                transform: scale(1.2);
              }
            }

            @keyframes float-particle-1 {
              0%,
              100% {
                transform: translateY(0px) translateX(0px);
                opacity: 0.4;
              }
              25% {
                transform: translateY(-8px) translateX(3px);
                opacity: 0.8;
              }
              50% {
                transform: translateY(-12px) translateX(0px);
                opacity: 0.6;
              }
              75% {
                transform: translateY(-8px) translateX(-3px);
                opacity: 0.8;
              }
            }

            @keyframes float-particle-2 {
              0%,
              100% {
                transform: translateY(0px) translateX(0px);
                opacity: 0.3;
              }
              30% {
                transform: translateY(-6px) translateX(-2px);
                opacity: 0.7;
              }
              60% {
                transform: translateY(-10px) translateX(2px);
                opacity: 0.5;
              }
              90% {
                transform: translateY(-4px) translateX(0px);
                opacity: 0.9;
              }
            }

            /* モバイル最適化 */
            @media (max-width: 768px) {
              @keyframes gentle-float {
                0%,
                100% {
                  transform: translateY(0px);
                }
                50% {
                  transform: translateY(-2px);
                }
              }

              .group:active {
                transform: scale(0.95) translateY(-1px);
              }
            }
          `}</style>
        </div>
      </section>

      {/* 成果統計セクション */}
      <section className="px-6 py-24 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
              <span className="text-emerald-400">数字</span>が証明する革命
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-300">
              世界中のユーザーが体験している、確かな成果
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat, index) => (
              <div
                key={index}
                className="p-8 text-center rounded-2xl border backdrop-blur-sm transition-all duration-300 group bg-white/5 border-white/10 hover:border-emerald-400/30 hover:bg-white/10"
              >
                <div className="mb-4 text-4xl font-black text-emerald-400 transition-transform duration-300 md:text-5xl group-hover:scale-110">
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="mb-3 text-lg font-bold text-white">
                  {stat.label}
                </div>
                <div className="text-sm leading-relaxed text-slate-400">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 機能デモセクション */}
      <section id="features" className="px-6 py-32 bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-24 text-center">
            <h2 className="mb-8 text-4xl font-bold text-white md:text-6xl">
              <span className="text-emerald-400">AI</span>があなたの代わりに
              <br className="hidden md:block" />
              すべてを<span className="text-emerald-400">自動化</span>
            </h2>
            <p className="mx-auto max-w-4xl text-2xl leading-relaxed text-slate-300">
              一言で始まる、複数AI協調の
              <span className="font-bold text-emerald-400">無限可能性</span>
            </p>
          </div>

          {/* シンプルなデモ */}
          <div className="mx-auto mb-24 max-w-4xl">
            <div className="p-12 rounded-3xl border backdrop-blur-sm bg-white/5 border-white/10">
              <div className="mb-12 text-center">
                <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl">
                  <span className="text-4xl">🎯</span>
                </div>
                <h3 className="mb-4 text-3xl font-bold text-white">
                  一言で始まる自動化
                </h3>
                <p className="text-xl text-slate-300">
                  「明日のプレゼン準備して」→ 3分で完了
                </p>
              </div>

              <div className="grid gap-6 mb-8 md:grid-cols-4">
                <div className="p-4 text-center rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                  <div className="mb-2 text-3xl">📊</div>
                  <div className="font-medium text-emerald-400">データ収集</div>
                </div>
                <div className="p-4 text-center rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                  <div className="mb-2 text-3xl">🎨</div>
                  <div className="font-medium text-emerald-400">
                    スライド作成
                  </div>
                </div>
                <div className="p-4 text-center rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                  <div className="mb-2 text-3xl">📝</div>
                  <div className="font-medium text-emerald-400">原稿準備</div>
                </div>
                <div className="p-4 text-center rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                  <div className="mb-2 text-3xl">✨</div>
                  <div className="font-medium text-emerald-400">完璧仕上げ</div>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-block px-6 py-3 rounded-full border bg-emerald-500/20 border-emerald-500/50">
                  <span className="font-bold text-emerald-300">
                    🎉 完璧なプレゼンが完成！
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 連携サービス */}
          <div className="mb-24 text-center">
            <h3 className="mb-8 text-2xl font-bold text-white">
              4,000以上のサービスと連携
            </h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {SERVICES.map((service) => (
                <span
                  key={service}
                  className="px-6 py-3 rounded-full border transition-colors bg-white/5 text-slate-300 border-white/10 hover:border-emerald-400/30"
                >
                  {service}
                </span>
              ))}
              <span className="px-6 py-3 font-medium text-emerald-400 rounded-full border bg-emerald-500/10 border-emerald-500/30">
                +3,992 more
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 最終CTAセクション */}
      <section className="px-6 py-24 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-4xl font-bold text-white md:text-5xl">
            あなたの<span className="text-emerald-400">デジタル分身</span>
            を今すぐ作成
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-xl text-slate-300">
            4,000以上のサービスと連携して、AI革命を今すぐ体験しよう
          </p>

          <div className="flex flex-col gap-6 justify-center items-center mb-16 sm:flex-row">
            {!isLoading && user ? (
              <Link
                href="/dashboard"
                className="px-12 py-6 text-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl shadow-2xl transition-all duration-300 transform hover:from-emerald-600 hover:via-emerald-500 hover:to-cyan-600 hover:scale-105 hover:shadow-emerald-500/30"
              >
                ダッシュボードで開始
              </Link>
            ) : !isLoading ? (
              <Link
                href="/auth/signup"
                className="px-12 py-6 text-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl shadow-2xl transition-all duration-300 transform hover:from-emerald-600 hover:via-emerald-500 hover:to-cyan-600 hover:scale-105 hover:shadow-emerald-500/30"
              >
                デジタル分身を今すぐ作成
              </Link>
            ) : (
              <div className="px-12 py-6 text-xl font-bold text-transparent bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl animate-pulse">
                読込中...
              </div>
            )}

            <button
              onClick={() => setIsVideoPlaying(!isVideoPlaying)}
              className="flex items-center px-8 py-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 text-slate-300 hover:text-white border-slate-600/50 hover:border-emerald-400/50 bg-white/5 hover:bg-white/10"
            >
              {isVideoPlaying ? (
                <Pause className="mr-3 w-5 h-5" />
              ) : (
                <Play className="mr-3 w-5 h-5" />
              )}
              <span className="font-medium">デモ動画を見る</span>
            </button>
          </div>

          <div className="p-8 rounded-2xl border backdrop-blur-sm bg-white/5 border-white/10">
            <p className="mb-3 text-lg text-slate-300">
              ✅ 30日間無料トライアル　✅ いつでもキャンセル可能　✅
              即座に利用開始
            </p>
            <p className="text-slate-400">
              数千人のユーザーが既に新しい働き方をスタートしています
            </p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="px-6 py-16 border-t border-slate-700/50 bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 mb-12 md:grid-cols-4">
            {/* ブランド */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center mb-6 space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">
                  BridgeSpeak
                </span>
              </Link>

              <p className="mb-8 max-w-md leading-relaxed text-slate-400">
                MCP統合により4,000以上のサービスと連携可能な、あなた専用のスーパーAIアシスタント。
              </p>

              <div className="flex space-x-4">
                {SOCIAL_LINKS.slice(0, 3).map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                    aria-label={social.name}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox={social.viewBox}
                    >
                      <path
                        d={social.path}
                        fillRule={
                          social.name === "GitHub" || social.name === "LinkedIn"
                            ? "evenodd"
                            : undefined
                        }
                        clipRule={
                          social.name === "GitHub" || social.name === "LinkedIn"
                            ? "evenodd"
                            : undefined
                        }
                      />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* プロダクト */}
            <div>
              <h3 className="mb-6 font-bold text-white">プロダクト</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                  >
                    機能
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                  >
                    セキュリティ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                  >
                    統合
                  </a>
                </li>
              </ul>
            </div>

            {/* サポート */}
            <div>
              <h3 className="mb-6 font-bold text-white">サポート</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                  >
                    ヘルプセンター
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                  >
                    お問い合わせ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors text-slate-400 hover:text-emerald-400"
                  >
                    コミュニティ
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 text-center border-t border-slate-700/50">
            <p className="text-slate-500">
              © 2024 BridgeSpeak. All rights reserved. |
              <a
                href="#"
                className="ml-2 transition-colors hover:text-emerald-400"
              >
                プライバシーポリシー
              </a>{" "}
              |
              <a
                href="#"
                className="ml-2 transition-colors hover:text-emerald-400"
              >
                利用規約
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
