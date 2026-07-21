"use client";

/**
 * ローカル LLM (WebLLM) のエンジンライフサイクルを管理する Context。
 *
 * - エンジンは Web Worker 上で動作し、メインスレッドのカクつきを防ぐ。
 * - ダッシュボード全体でエンジンを保持するため、チャット間を移動しても
 *   モデルの再ダウンロード/再ロードが発生しない。
 * - モデルは IndexedDB にキャッシュされるため、2回目以降の起動は高速。
 *
 * 設計は既存の ThemeContext と同じ「Provider + useXxx フック」方式。
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { MLCEngineInterface, InitProgressReport } from "@mlc-ai/web-llm";
import { checkWebGPUSupport } from "@/lib/local-llm/support";

export type LocalLLMStatus =
  | "idle" // 未ロード
  | "checking" // WebGPU 判定中
  | "unsupported" // WebGPU 非対応
  | "loading" // モデルダウンロード/ロード中
  | "ready" // 推論可能
  | "error"; // ロード失敗

export type LocalLLMProgress = {
  text: string
  ratio: number
}

interface LocalLLMContextType {
  status: LocalLLMStatus
  progress: LocalLLMProgress | null
  currentModelId: string | null
  errorMessage: string | null
  /** 指定モデルをロード（既にロード済みなら即 resolve）。ロード後のエンジンを返す。 */
  ensureEngine: (modelId: string) => Promise<MLCEngineInterface>
  /** ロード済みエンジンを取得（未ロードなら null） */
  getEngine: () => MLCEngineInterface | null
  /** エンジンを破棄してメモリを解放 */
  unload: () => Promise<void>
}

const LocalLLMContext = createContext<LocalLLMContextType | undefined>(undefined);

export function useLocalLLM() {
  const ctx = useContext(LocalLLMContext);
  if (ctx === undefined) {
    throw new Error("useLocalLLM must be used within a LocalLLMProvider");
  }
  return ctx;
}

export function LocalLLMProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocalLLMStatus>("idle");
  const [progress, setProgress] = useState<LocalLLMProgress | null>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const engineRef = useRef<MLCEngineInterface | null>(null);
  const workerRef = useRef<Worker | null>(null);
  // 同一モデルの多重ロードを防ぐための進行中 Promise
  const loadingPromiseRef = useRef<Promise<MLCEngineInterface> | null>(null);

  const getEngine = useCallback(() => engineRef.current, []);

  const ensureEngine = useCallback(
    async (modelId: string): Promise<MLCEngineInterface> => {
      // 既に同じモデルがロード済みならそのまま返す
      if (engineRef.current && currentModelId === modelId) {
        return engineRef.current;
      }
      // 同一ロードが進行中なら、それを待つ
      if (loadingPromiseRef.current && currentModelId === modelId) {
        return loadingPromiseRef.current;
      }

      const loadPromise = (async () => {
        setErrorMessage(null);
        setStatus("checking");

        const support = await checkWebGPUSupport();
        if (!support.supported) {
          setStatus("unsupported");
          setErrorMessage(support.reason || "WebGPU 非対応");
          throw new Error(support.reason || "WebGPU is not supported");
        }

        setStatus("loading");
        setProgress({ text: "初期化中...", ratio: 0 });
        setCurrentModelId(modelId);

        try {
          // 別モデルへ切り替える場合は既存 Worker を破棄
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            engineRef.current = null;
          }

          const worker = new Worker(
            new URL("@/lib/local-llm/webllm.worker.ts", import.meta.url),
            { type: "module" }
          );
          workerRef.current = worker;

          const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
          const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
            initProgressCallback: (report: InitProgressReport) => {
              setProgress({ text: report.text, ratio: report.progress });
            },
          });

          engineRef.current = engine;
          setStatus("ready");
          setProgress({ text: "準備完了", ratio: 1 });
          return engine;
        } catch (e) {
          setStatus("error");
          setErrorMessage(e instanceof Error ? e.message : String(e));
          // 失敗時はクリーンアップ
          workerRef.current?.terminate();
          workerRef.current = null;
          engineRef.current = null;
          setCurrentModelId(null);
          throw e;
        } finally {
          loadingPromiseRef.current = null;
        }
      })();

      loadingPromiseRef.current = loadPromise;
      return loadPromise;
    },
    [currentModelId]
  );

  const unload = useCallback(async () => {
    try {
      await engineRef.current?.unload?.();
    } catch {
      // no-op
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    engineRef.current = null;
    loadingPromiseRef.current = null;
    setCurrentModelId(null);
    setProgress(null);
    setStatus("idle");
  }, []);

  return (
    <LocalLLMContext.Provider
      value={{
        status,
        progress,
        currentModelId,
        errorMessage,
        ensureEngine,
        getEngine,
        unload,
      }}
    >
      {children}
    </LocalLLMContext.Provider>
  );
}
