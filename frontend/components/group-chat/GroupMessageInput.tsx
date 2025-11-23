"use client";

import React, {
  useState,
  useRef,
  KeyboardEvent,
  useCallback,
  useEffect,
} from "react";
import { Send, X, Paperclip, Smile } from "lucide-react";
import { GroupMember, MentionInput } from "@/lib/api/group-chat";
import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import { StampPicker } from "../chat/StampPicker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Mention {
  agentId: string;
  agentName: string;
  agentIcon?: string;
  isAll: boolean;
  order: number;
}

interface MentionTagProps {
  mention: Mention;
  onRemove?: (agentId: string) => void;
  isDragging?: boolean;
}

function MentionTag({ mention, onRemove, isDragging }: MentionTagProps) {
  return (
    <div
      className={cn(
        "group inline-flex items-center gap-2 pl-2 pr-2.5 py-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 whitespace-nowrap",
        !isDragging && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-90 scale-110"
      )}
      style={{ width: "max-content" }}
    >
      {mention.agentIcon ? (
        <img
          src={mention.agentIcon}
          alt={mention.agentName}
          className="object-cover flex-shrink-0 w-6 h-6 rounded-full ring-2 ring-white/50"
        />
      ) : (
        <div className="flex flex-shrink-0 justify-center items-center w-6 h-6 text-xs font-bold rounded-full ring-2 ring-white/50 bg-white/20">
          {mention.agentName.charAt(0)}
        </div>
      )}
      <span className="font-semibold">@{mention.agentName}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(mention.agentId);
          }}
          className="flex-shrink-0 p-1 rounded-full transition-all duration-200 hover:bg-white/20 hover:rotate-90"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface SortableMentionProps {
  mention: Mention;
  onRemove: (agentId: string) => void;
}

function SortableMention({ mention, onRemove }: SortableMentionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mention.agentId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0 : 1, // ドラッグ中は元の位置を非表示
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MentionTag mention={mention} onRemove={onRemove} />
    </div>
  );
}

interface GroupMessageInputProps {
  members: GroupMember[];
  onSend: (content: string, mentions: "all" | MentionInput[]) => void;
  disabled?: boolean;
  // 新規追加
  value?: string;
  onValueChange?: (value: string) => void;
}

export function GroupMessageInput({
  members,
  onSend,
  disabled,
  value: externalValue,
  onValueChange,
}: GroupMessageInputProps) {
  const [internalContent, setInternalContent] = useState("");
  const content = externalValue !== undefined ? externalValue : internalContent;
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showStampPicker, setShowStampPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const mentionOptionsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0, // ドラッグ開始までの距離を0に（即座に開始）
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 選択されたメンション候補が見えるように自動スクロール
  useEffect(() => {
    if (
      showMentionSelector &&
      mentionOptionsRef.current[selectedMentionIndex]
    ) {
      mentionOptionsRef.current[selectedMentionIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedMentionIndex, showMentionSelector]);

  // スタンプピッカー外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStampPicker) {
        const target = event.target as HTMLElement;
        // スタンプピッカーとSmileボタン以外をクリックしたら閉じる
        if (
          !target.closest("[data-stamp-picker]") &&
          !target.closest("[data-smile-button]")
        ) {
          setShowStampPicker(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStampPicker]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMentions((items) => {
        const oldIndex = items.findIndex((item) => item.agentId === active.id);
        const newIndex = items.findIndex((item) => item.agentId === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // 順序を更新
        return newItems.map((item, index) => ({ ...item, order: index + 1 }));
      });
    }
    setActiveDragId(null);
  };

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "32px";
    const maxHeight = 200;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // フィルタリングされたメンバー（すでに選択済みのものを除外）
  const filteredMembers = members.filter((member) => {
    if (mentions.some((m) => m.agentId === member.ai_agent_id)) {
      return false;
    }
    if (mentionQuery) {
      return member.ai_agent_name
        .toLowerCase()
        .includes(mentionQuery.toLowerCase());
    }
    return true;
  });

  // @allオプション（まだ選択されていない場合のみ表示）
  const showAllOption =
    !mentions.some((m) => m.isAll) &&
    (!mentionQuery || "all".toLowerCase().includes(mentionQuery.toLowerCase()));

  const availableOptions = [
    ...(showAllOption ? [{ id: "all", name: "all", isAll: true }] : []),
    ...filteredMembers.map((m) => ({
      id: m.ai_agent_id,
      name: m.ai_agent_name,
      icon: m.ai_agent_icon,
      isAll: false,
    })),
  ];

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // @が入力された場合の検出
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastChar = textBeforeCursor.slice(-1);

    if (lastChar === "@") {
      // @を削除して候補リストを開く
      const newValue =
        value.substring(0, cursorPos - 1) + value.substring(cursorPos);
      // 外部制御の場合は親に通知、そうでなければ内部ステートを更新
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        setInternalContent(newValue);
      }
      setCursorPosition(cursorPos - 1);
      adjustTextareaHeight();

      // 候補リストを開く
      setMentionStartPos(cursorPos - 1);
      setMentionQuery("");
      setShowMentionSelector(true);
      setSelectedMentionIndex(0);

      // カーソル位置を調整
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = cursorPos - 1;
          textareaRef.current.selectionEnd = cursorPos - 1;
        }
      }, 0);

      return;
    }

    // 外部制御の場合は親に通知、そうでなければ内部ステートを更新
    if (onValueChange) {
      onValueChange(value);
    } else {
      setInternalContent(value);
    }
    setCursorPosition(cursorPos);
    adjustTextareaHeight();

    // 候補リストが開いている場合は閉じる（@が削除された場合など）
    if (showMentionSelector) {
      setShowMentionSelector(false);
      setMentionStartPos(null);
      setMentionQuery("");
    }
  };

  const insertMention = (agentId: string | "all") => {
    if (mentionStartPos === null) return;

    const isAll = agentId === "all";
    const member = isAll
      ? null
      : members.find((m) => m.ai_agent_id === agentId);

    if (isAll) {
      // @allを選択した場合、全メンバーを個別に追加して閉じる
      const allMentions: Mention[] = members.map((member, index) => ({
        agentId: member.ai_agent_id,
        agentName: member.ai_agent_name,
        agentIcon: member.ai_agent_icon,
        isAll: false,
        order: index + 1,
      }));
      setMentions(allMentions);

      // 候補リストを閉じる（@は既に入力フィールドにない）
      setShowMentionSelector(false);
      setMentionStartPos(null);
      setMentionQuery("");

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    } else if (member) {
      // 通常のメンション追加
      const newMention: Mention = {
        agentId: member.ai_agent_id,
        agentName: member.ai_agent_name,
        agentIcon: member.ai_agent_icon,
        isAll: false,
        order: mentions.length + 1,
      };
      setMentions([...mentions, newMention]);

      // 候補リストを閉じる（@は既に入力フィールドにない）
      setShowMentionSelector(false);
      setMentionStartPos(null);
      setMentionQuery("");

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionSelector && availableOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        // 0から始まり、availableOptions.length（閉じる）まで循環
        setSelectedMentionIndex((prev) => {
          if (prev === availableOptions.length) return 0;
          return prev + 1;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        // availableOptions.length（閉じる）から0まで循環
        setSelectedMentionIndex((prev) => {
          if (prev === 0) return availableOptions.length;
          return prev - 1;
        });
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (selectedMentionIndex === availableOptions.length) {
          // 閉じる選択肢が選ばれている場合
          setShowMentionSelector(false);
          setMentionStartPos(null);
          setMentionQuery("");
          // @は既に入力フィールドにないため、削除処理は不要
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 0);
        } else {
          insertMention(availableOptions[selectedMentionIndex].id);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionSelector(false);
        setMentionStartPos(null);
      }
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRemoveMention = (agentId: string) => {
    const newMentions = mentions.filter((m) => m.agentId !== agentId);
    const reordered = newMentions.map((m, index) => ({
      ...m,
      order: index + 1,
    }));
    setMentions(reordered);
  };

  const handleStampSelect = (stamp: string) => {
    // スタンプをメッセージ入力欄に追加
    const newValue = content + stamp;
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalContent(newValue);
    }
    // スタンプピッカーは開いたまま（ユーザーが✖️ボタンまたは外側をクリックするまで）
  };

  const handleSend = () => {
    if (mentions.length === 0 || disabled) return;

    const hasAll = mentions.some((m) => m.isAll);
    const apiMentions: "all" | MentionInput[] = hasAll
      ? "all"
      : mentions.map((m) => ({
          ai_agent_id: m.agentId,
          order: m.order,
        }));

    onSend(content.trim(), apiMentions);

    // 送信後にクリア
    if (onValueChange) {
      onValueChange("");
    } else {
      setInternalContent("");
    }
    setMentions([]);
  };

  return (
    <div className="flex-shrink-0 px-3 pt-0 pb-3 bg-gray-50 md:px-4 md:pb-4 dark:bg-gray-900">
      <div className="relative w-full">
        {/* 統合されたモダンな入力コンテナ */}
        <div
          className={cn(
            "flex flex-col gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600",
            "transition-all duration-200 focus-within:ring-2 focus-within:ring-green-500 dark:focus-within:ring-emerald-500 focus-within:border-green-500 dark:focus-within:border-emerald-500"
          )}
        >
          {/* メンションタグエリア */}
          {mentions.length > 0 && (
            <div className="pb-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={mentions.map((m) => m.agentId)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    {mentions.map((mention, index) => (
                      <React.Fragment key={mention.agentId}>
                        <SortableMention
                          mention={mention}
                          onRemove={handleRemoveMention}
                        />
                        {index < mentions.length - 1 && (
                          <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
                            →
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeDragId ? (
                    <MentionTag
                      mention={
                        mentions.find((m) => m.agentId === activeDragId)!
                      }
                      isDragging={true}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}

          {/* テキストエリア */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isMobile
                ? "メッセージを入力... (@でメンション)"
                : "メッセージを入力... (@でメンション、Cmd/Ctrl+Enterで送信）"
            }
            className={cn(
              "px-0 py-0 w-full bg-transparent border-0 resize-none",
              "overflow-y-auto overflow-x-hidden focus:outline-none",
              "text-base placeholder-gray-500 text-gray-900 dark:placeholder-gray-400 dark:text-gray-100"
            )}
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            style={{ minHeight: "32px", lineHeight: "24px" }}
            disabled={disabled}
          />

          {/* ボタン類 */}
          <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600">
            <div className="flex gap-1 items-center">
              {/* ファイル添付ボタン */}
              <button
                className="p-1.5 text-gray-400 rounded-lg transition-colors dark:text-gray-500 hover:text-green-500 dark:hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                aria-label="ファイルを添付"
                title="ファイルを添付"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* スマイルボタン */}
              <button
                data-smile-button
                onClick={() => setShowStampPicker(!showStampPicker)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  showStampPicker
                    ? "text-green-500 bg-green-50 dark:text-emerald-500 dark:bg-green-500/10"
                    : "text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                )}
                aria-label={
                  showStampPicker
                    ? "スタンプピッカーを閉じる"
                    : "スタンプを選択"
                }
                title="スタンプを選択"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* 送信ボタン */}
            <button
              onClick={handleSend}
              disabled={mentions.length === 0 || disabled}
              aria-label="メッセージを送信"
              title="送信（Cmd/Ctrl+Enter）"
              className={cn(
                "px-4 py-1.5 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-1.5",
                mentions.length > 0 && !disabled
                  ? "text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-sm hover:shadow-md shadow-green-500/40 dark:from-green-500 dark:to-emerald-600 dark:hover:from-green-600 dark:hover:to-emerald-700"
                  : "text-gray-400 bg-gray-200 dark:text-gray-500 dark:bg-gray-600"
              )}
            >
              <Send className="w-4 h-4" />
              <span className="text-sm font-medium">送信</span>
            </button>
          </div>
        </div>

        {/* メンション候補セレクター */}
        {showMentionSelector && availableOptions.length > 0 && (
          <div className="absolute right-0 left-0 bottom-full mb-3 rounded-2xl border shadow-2xl backdrop-blur-xl bg-white/95 border-gray-200/50 dark:bg-gray-900/95 dark:border-gray-700/50">
            <div className="overflow-y-auto overflow-x-hidden p-2 max-h-64">
              {availableOptions.map((option, index) => {
                if (option.isAll) {
                  // @all（アイコンなし）
                  return (
                    <button
                      key={option.id}
                      ref={(el) => (mentionOptionsRef.current[index] = el)}
                      onClick={() => insertMention(option.id)}
                      className={cn(
                        "flex items-center px-4 py-3 w-full text-left rounded-xl transition-all duration-200",
                        index === selectedMentionIndex
                          ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg scale-[1.02]"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.01]"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "text-sm font-semibold truncate",
                            index === selectedMentionIndex
                              ? "text-white"
                              : "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          @all
                        </div>
                        <div
                          className={cn(
                            "text-xs truncate",
                            index === selectedMentionIndex
                              ? "text-white/80"
                              : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          全員にメンション ({members.length}人)
                        </div>
                      </div>
                    </button>
                  );
                }

                // 通常のメンバー選択肢
                return (
                  <button
                    key={option.id}
                    ref={(el) => (mentionOptionsRef.current[index] = el)}
                    onClick={() => insertMention(option.id)}
                    className={cn(
                      "flex gap-3 items-center px-4 py-3 w-full text-left rounded-xl transition-all duration-200",
                      index === selectedMentionIndex
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg scale-[1.02]"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.01]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex overflow-hidden flex-shrink-0 justify-center items-center w-10 h-10 rounded-full transition-all duration-200",
                        index === selectedMentionIndex
                          ? "ring-2 ring-white/50 shadow-md"
                          : "ring-2 ring-emerald-200 dark:ring-emerald-800"
                      )}
                    >
                      {"icon" in option && option.icon ? (
                        <img
                          src={option.icon}
                          alt={option.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex justify-center items-center w-full h-full bg-gradient-to-br from-emerald-400 to-cyan-500">
                          <span className="text-sm font-bold text-white">
                            {option.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-sm font-semibold truncate",
                          index === selectedMentionIndex
                            ? "text-white"
                            : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        @{option.name}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* 閉じる選択肢（一番下に表示） */}
              <button
                ref={(el) =>
                  (mentionOptionsRef.current[availableOptions.length] = el)
                }
                onClick={() => {
                  setShowMentionSelector(false);
                  setMentionStartPos(null);
                  setMentionQuery("");
                  // @は既に入力フィールドにないため、削除処理は不要
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }, 0);
                }}
                className={cn(
                  "flex items-center justify-center px-3 py-2 w-full text-center rounded-lg transition-all duration-200 mt-2 border border-gray-200 dark:border-gray-700",
                  selectedMentionIndex === availableOptions.length
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-xs font-medium">
                  閉じる
                  {!isMobile && <span className="ml-1 opacity-60">(Esc)</span>}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* スタンプピッカー */}
        {showStampPicker && (
          <StampPicker
            onSelectStamp={handleStampSelect}
            onClose={() => setShowStampPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
