"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent } from "react";

interface VerifyCodeInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string;
}

export function VerifyCodeInput({
  onComplete,
  disabled,
  error,
}: VerifyCodeInputProps) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // 数字のみ許可
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // 次のフィールドにフォーカス
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 6桁入力完了時
    if (newCode.every((digit) => digit !== "")) {
      onComplete(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspaceで前のフィールドに戻る
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    // 6桁の数字のみ許可
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      onComplete(pastedData);
    }
  };

  const clearCode = () => {
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center md:gap-3">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              w-12 h-16 md:w-14 md:h-16
              text-2xl text-center font-semibold
              bg-white/10 backdrop-blur-sm
              border-2 ${
                error
                  ? "border-red-500"
                  : digit
                  ? "border-emerald-500"
                  : "border-white/20"
              }
              text-white
              rounded-xl
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={`認証コード${index + 1}桁目`}
          />
        ))}
      </div>

      {error && (
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={clearCode}
            className="mt-2 text-sm text-emerald-400 transition-colors hover:text-emerald-300"
          >
            クリアして再入力
          </button>
        </div>
      )}
    </div>
  );
}
