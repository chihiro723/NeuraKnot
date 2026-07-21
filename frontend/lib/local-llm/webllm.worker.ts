/**
 * WebLLM 用 Web Worker
 *
 * 重い推論処理をメインスレッドから分離し、UI のカクつきを防ぐ。
 * メインスレッド側は `CreateWebWorkerMLCEngine` にこの Worker を渡すことで、
 * OpenAI 互換 API をそのまま利用できる（プロキシ経由でこの Worker に転送される）。
 *
 * 参考: https://github.com/mlc-ai/web-llm (Web Worker パターン)
 */
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// エンジン本体を Worker スレッド内に生成し、メインスレッドからのメッセージを処理する
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
