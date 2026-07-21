"use client";

/**
 * Phase 0: ローカル LLM (WebLLM) 実証ラボページ
 *
 * 本体のチャットに組み込む前に、この隔離ページで
 *   1. WebGPU が使えるか
 *   2. Web Worker 上のエンジンでモデルをダウンロードできるか（進捗表示）
 *   3. ストリーミング推論が動くか
 * を自分の端末・ブラウザで確認するためのもの。
 *
 * ここで問題なく動けば、Phase 1 以降で同じ仕組み（Worker + CreateWebWorkerMLCEngine）を
 * LocalLLMContext としてアプリ全体に展開する。
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  MLCEngineInterface,
  InitProgressReport,
} from "@mlc-ai/web-llm";
import { checkWebGPUSupport } from "@/lib/local-llm/support";

// 検証用の軽量モデル（約 900MB / 1B クラス）。まずは軽いモデルで疎通確認する。
const LAB_MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

type Status = "idle" | "checking" | "unsupported" | "loading" | "ready" | "generating";

export default function LocalLLMLabPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [supportReason, setSupportReason] = useState<string | null>(null);
  const [progressText, setProgressText] = useState("");
  const [progressRatio, setProgressRatio] = useState(0);
  const [prompt, setPrompt] = useState("こんにちは。あなたは誰ですか？一言で答えてください。");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<MLCEngineInterface | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // アンマウント時に Worker を破棄
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      engineRef.current = null;
    };
  }, []);

  const handleLoad = useCallback(async () => {
    setError(null);
    setStatus("checking");

    const support = await checkWebGPUSupport();
    if (!support.supported) {
      setSupportReason(support.reason || "WebGPU 非対応");
      setStatus("unsupported");
      return;
    }

    setStatus("loading");
    setProgressText("初期化中...");
    setProgressRatio(0);

    try {
      // Worker を生成（Turbopack/webpack が new URL 形式でバンドルする）
      const worker = new Worker(
        new URL("@/lib/local-llm/webllm.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      // 動的 import（サーバーサイドバンドルに WebLLM を含めないため）
      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

      const engine = await CreateWebWorkerMLCEngine(worker, LAB_MODEL_ID, {
        initProgressCallback: (report: InitProgressReport) => {
          setProgressText(report.text);
          setProgressRatio(report.progress);
        },
      });

      engineRef.current = engine;
      setStatus("ready");
      setProgressText("モデルの準備が完了しました");
      setProgressRatio(1);
    } catch (e) {
      console.error("WebLLM load error:", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;

    setError(null);
    setOutput("");
    setStatus("generating");

    try {
      const chunks = await engine.chat.completions.create({
        messages: [
          { role: "system", content: "あなたは親切な日本語アシスタントです。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        stream: true,
      });

      let full = "";
      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || "";
        full += delta;
        setOutput(full);
      }
      setStatus("ready");
    } catch (e) {
      console.error("WebLLM generate error:", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("ready");
    }
  }, [prompt]);

  return (
    <div className="overflow-y-auto flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          ローカル LLM 実証ラボ (WebLLM)
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          ブラウザ内 (WebGPU) でモデルを実行できるか検証するページです。モデル:
          <code className="px-1 mx-1 bg-gray-200 rounded dark:bg-gray-700">
            {LAB_MODEL_ID}
          </code>
          （約 900MB。初回のみダウンロードが発生します）
        </p>

        {/* ステータス表示 */}
        <div className="p-4 mb-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ステータス
            </span>
            <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded dark:text-green-300 dark:bg-green-500/20">
              {status}
            </span>
          </div>

          {(status === "loading" || status === "ready") && (
            <div className="mt-2">
              <div className="overflow-hidden w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 break-all dark:text-gray-400">
                {progressText}
              </p>
            </div>
          )}

          {status === "unsupported" && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {supportReason}
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600 break-all dark:text-red-400">
              エラー: {error}
            </p>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleLoad}
            disabled={status === "loading" || status === "checking"}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading"
              ? "ロード中..."
              : status === "ready" || status === "generating"
              ? "再ロード"
              : "モデルをロード"}
          </button>
        </div>

        {/* 推論 */}
        {(status === "ready" || status === "generating") && (
          <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="p-2 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <button
              onClick={handleGenerate}
              disabled={status === "generating"}
              className="px-4 py-2 mt-2 text-sm font-medium text-white bg-emerald-600 rounded-lg transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {status === "generating" ? "生成中..." : "推論を実行"}
            </button>

            {output && (
              <div className="p-3 mt-3 text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg dark:bg-gray-900 dark:text-gray-200">
                {output}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
