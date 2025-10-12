"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StampPickerProps {
  onSelectStamp: (stamp: string) => void;
  onClose: () => void;
}

// スタンプのカテゴリー定義
const STAMP_CATEGORIES = [
  {
    id: "emotions",
    name: "感情",
    stamps: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🥸",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
      "🤗",
      "🤔",
      "🤭",
      "🤫",
      "🤥",
    ],
  },
  {
    id: "gestures",
    name: "ジェスチャー",
    stamps: [
      "👋",
      "🤚",
      "🖐",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "💪",
    ],
  },
  {
    id: "hearts",
    name: "ハート",
    stamps: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❤️‍🔥",
      "❤️‍🩹",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "💌",
      "💋",
      "💑",
      "💏",
    ],
  },
  {
    id: "animals",
    name: "動物",
    stamps: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🙈",
      "🙉",
      "🙊",
      "🐔",
      "🐧",
      "🐦",
      "🐤",
      "🐣",
      "🐥",
      "🦆",
      "🦅",
      "🦉",
      "🦇",
      "🐺",
      "🐗",
      "🐴",
      "🦄",
    ],
  },
  {
    id: "food",
    name: "食べ物",
    stamps: [
      "🍎",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🍆",
      "🥑",
      "🥦",
      "🥬",
      "🥒",
      "🌶",
      "🌽",
      "🥕",
      "🧄",
      "🍔",
      "🍟",
      "🍕",
      "🌭",
      "🥪",
      "🌮",
      "🌯",
      "🍜",
      "🍝",
      "🍱",
      "🍣",
      "🍤",
      "🍙",
      "🍚",
      "🍛",
      "🍲",
      "🍰",
      "🎂",
      "🧁",
      "🍮",
      "🍭",
      "🍬",
      "🍫",
      "🍿",
      "☕",
      "🍵",
      "🥤",
      "🧃",
      "🧋",
      "🍺",
      "🍻",
      "🥂",
    ],
  },
  {
    id: "activities",
    name: "活動",
    stamps: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🥏",
      "🎱",
      "🪀",
      "🏓",
      "🏸",
      "🏒",
      "🏑",
      "🥍",
      "🏏",
      "🎯",
      "🎮",
      "🕹",
      "🎲",
      "♠️",
      "♥️",
      "♦️",
      "♣️",
      "🎭",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎹",
      "🎸",
      "🎺",
      "🎷",
      "🥁",
      "🎻",
      "📷",
      "📹",
      "📽",
    ],
  },
  {
    id: "travel",
    name: "旅行",
    stamps: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🏎",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🛻",
      "🚚",
      "🚛",
      "🚜",
      "🛵",
      "🏍",
      "🛺",
      "🚲",
      "🛴",
      "🚁",
      "🛩",
      "✈️",
      "🛫",
      "🛬",
      "🚀",
      "🛸",
      "🚂",
      "🚃",
      "🚄",
      "🚅",
      "🚆",
      "🚇",
      "🚈",
      "🚉",
      "🚊",
      "🚝",
      "🚞",
      "🚋",
      "🚌",
      "🚍",
      "🚎",
      "🚏",
      "⛵",
      "🛶",
      "🚤",
      "🛥",
      "🛳",
      "⛴",
    ],
  },
  {
    id: "objects",
    name: "オブジェクト",
    stamps: [
      "⌚",
      "📱",
      "📲",
      "💻",
      "⌨️",
      "🖥",
      "🖨",
      "🖱",
      "🖲",
      "💽",
      "💾",
      "💿",
      "📀",
      "📼",
      "📷",
      "📸",
      "📹",
      "🎥",
      "📽",
      "🎞",
      "📞",
      "☎️",
      "📟",
      "📠",
      "📺",
      "📻",
      "🎙",
      "🎚",
      "🎛",
      "🧭",
      "⏰",
      "⏱",
      "⏲",
      "⌛",
      "⏳",
      "📡",
      "🔋",
      "🔌",
      "💡",
      "🔦",
      "🕯",
      "🪔",
      "🧯",
      "🛢",
      "💸",
      "💵",
      "💴",
      "💶",
      "💷",
      "💰",
      "💳",
      "💎",
      "⚖️",
      "🪜",
      "🧰",
      "🔧",
    ],
  },
  {
    id: "nature",
    name: "自然",
    stamps: [
      "🌸",
      "💮",
      "🏵",
      "🌹",
      "🥀",
      "🌺",
      "🌻",
      "🌼",
      "🌷",
      "🌱",
      "🪴",
      "🌲",
      "🌳",
      "🌴",
      "🌵",
      "🌾",
      "🌿",
      "☘️",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🌑",
      "🌒",
      "🌓",
      "🌔",
      "🌕",
      "🌖",
      "🌗",
      "🌘",
      "🌙",
      "🌚",
      "🌛",
      "🌜",
      "☀️",
      "🌝",
      "🌞",
      "⭐",
      "🌟",
      "✨",
      "⚡",
      "🔥",
      "💥",
      "☄️",
      "🌈",
      "🌊",
      "💧",
      "💦",
    ],
  },
];

export function StampPicker({ onSelectStamp, onClose }: StampPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(
    STAMP_CATEGORIES[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");

  // ドラッグ機能の状態
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);

  const currentCategory =
    STAMP_CATEGORIES.find((cat) => cat.id === selectedCategory) ||
    STAMP_CATEGORIES[0];

  const filteredStamps = searchQuery
    ? currentCategory.stamps.filter((stamp) => stamp.includes(searchQuery))
    : currentCategory.stamps;

  const handleStampClick = (stamp: string) => {
    onSelectStamp(stamp);
    // onClose()を削除 - スタンプピッカーは開いたまま
  };

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent) => {
    if (!pickerRef.current) return;

    const rect = pickerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  // ドラッグ中
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !pickerRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={pickerRef}
      data-stamp-picker
      className={cn(
        "fixed z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl dark:bg-gray-800 dark:border-gray-700",
        isDragging ? "cursor-grabbing" : ""
      )}
      style={{
        left: position.x !== 0 ? `${position.x}px` : "25%",
        top: position.y !== 0 ? `${position.y}px` : "auto",
        right: "auto",
        bottom: position.y !== 0 ? "auto" : "120px",
      }}
    >
      {/* ドラッグ可能なヘッダー */}
      <div
        className={cn(
          "flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 cursor-grab select-none",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleDragStart}
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          スタンプを選択
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 rounded-lg transition-colors hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 検索バー */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="スタンプを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="py-2 pr-4 pl-10 w-full text-sm bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* カテゴリータブ */}
      <div className="flex overflow-x-auto p-2 border-b border-gray-200 dark:border-gray-700 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {STAMP_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              selectedCategory === category.id
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* スタンプグリッド */}
      <div className="overflow-y-auto p-3 h-72 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <div className="grid grid-cols-7 gap-2">
          {filteredStamps.map((stamp, index) => (
            <button
              key={`${stamp}-${index}`}
              onClick={() => handleStampClick(stamp)}
              className="flex justify-center items-center w-9 h-9 text-xl rounded-lg transition-all duration-200 hover:bg-gray-100 hover:scale-125 dark:hover:bg-gray-700 active:scale-95"
              title={stamp}
            >
              {stamp}
            </button>
          ))}
        </div>

        {filteredStamps.length === 0 && (
          <div className="flex flex-col justify-center items-center h-full text-gray-400">
            <span className="mb-2 text-4xl">🔍</span>
            <p className="text-sm">スタンプが見つかりません</p>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          ドラッグで移動 • クリックでスタンプを追加
        </p>
      </div>
    </div>
  );
}
