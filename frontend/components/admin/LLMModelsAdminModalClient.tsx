"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Loader2, Plus, Save, X } from "lucide-react";
import { ModalOverlay } from "@/components/ui/ModalOverlay";
import type { LLMModel, LLMPricing } from "@/lib/types/llm-model";
import {
  createLLMModel,
  createLLMPricing,
  deleteLLMModel,
  reviseLLMPricing,
  updateLLMModel,
  updateLLMModelEnabled,
} from "@/lib/actions/llm-models";

interface LLMModelsAdminModalClientProps {
  initialModels: LLMModel[];
}

type ModelFormState = {
  provider: string;
  model: string;
  display_name: string;
  temperature_min: string;
  temperature_max: string;
  max_tokens_min: string;
  max_tokens_max: string;
  supports_streaming: boolean;
  prompt_cost_per_1m: string;
  completion_cost_per_1m: string;
};

const clampTemperature = (value: number) =>
  Math.min(2, Math.max(0, Math.round(value * 10) / 10));
const MIN_TOKENS_LIMIT = 1;
const MAX_TOKENS_LIMIT = 200000;
const clampTokens = (value: number) =>
  Math.min(MAX_TOKENS_LIMIT, Math.max(MIN_TOKENS_LIMIT, Math.round(value)));

const DEFAULT_FORM: ModelFormState = {
  provider: "openai",
  model: "",
  display_name: "",
  temperature_min: "0",
  temperature_max: "2",
  max_tokens_min: "100",
  max_tokens_max: "8000",
  supports_streaming: true,
  prompt_cost_per_1m: "",
  completion_cost_per_1m: "",
};

export function LLMModelsAdminModalClient({
  initialModels,
}: LLMModelsAdminModalClientProps) {
  const [models, setModels] = useState<LLMModel[]>(initialModels);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [updatingModelID, setUpdatingModelID] = useState<string | null>(null);
  const [deletingModelID, setDeletingModelID] = useState<string | null>(null);
  const [savingModal, setSavingModal] = useState<"create" | "edit" | null>(
    null,
  );
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingModelID, setEditingModelID] = useState<string | null>(null);
  const [expandedModelIDs, setExpandedModelIDs] = useState<Set<string>>(
    new Set(),
  );
  const [form, setForm] = useState<ModelFormState>(DEFAULT_FORM);

  const isModalOpen = modalMode !== null;

  const handleCloseModal = () => {
    if (isPending) return;
    setModalMode(null);
    setEditingModelID(null);
    setModalError(null);
    setForm(DEFAULT_FORM);
  };

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen && !isPending) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isModalOpen, isPending]);

  const groupedByProvider = useMemo(() => {
    const map = new Map<string, LLMModel[]>();
    for (const model of models) {
      const existing = map.get(model.provider) ?? [];
      existing.push(model);
      map.set(model.provider, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [models]);

  const providerLabel = (provider: string) => {
    switch (provider) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "google":
        return "Google";
      default:
        return provider;
    }
  };

  const handleToggle = (model: LLMModel) => {
    setError(null);
    setUpdatingModelID(model.id);

    startTransition(async () => {
      const nextEnabled = !model.is_enabled;
      const result = await updateLLMModelEnabled(model.id, nextEnabled);
      if (!result.success) {
        setError(result.error || "モデル状態の更新に失敗しました");
        setUpdatingModelID(null);
        return;
      }

      setModels((prev) =>
        prev.map((entry) =>
          entry.id === model.id ? { ...entry, is_enabled: nextEnabled } : entry,
        ),
      );
      setUpdatingModelID(null);
    });
  };

  const handleDelete = (model: LLMModel) => {
    const confirmed = window.confirm(
      `[デバッグ用途] モデル「${model.display_name}」を物理削除します。既存エージェントに設定されている場合、再登録するまで実行できなくなります。続行しますか？`,
    );
    if (!confirmed) return;

    setError(null);
    setDeletingModelID(model.id);
    startTransition(async () => {
      const result = await deleteLLMModel(model.id);
      if (!result.success) {
        setError(result.error || "モデル削除に失敗しました");
        setDeletingModelID(null);
        return;
      }

      setModels((prev) => prev.filter((entry) => entry.id !== model.id));
      setExpandedModelIDs((prev) => {
        const next = new Set(prev);
        next.delete(model.id);
        return next;
      });
      setDeletingModelID(null);
    });
  };

  const toggleModelDetails = (modelID: string) => {
    setExpandedModelIDs((prev) => {
      const next = new Set(prev);
      if (next.has(modelID)) {
        next.delete(modelID);
      } else {
        next.add(modelID);
      }
      return next;
    });
  };

  const handleOpenCreateModal = () => {
    setModalError(null);
    setModalMode("create");
    setEditingModelID(null);
    setForm(DEFAULT_FORM);
  };

  const handleOpenEditModal = (model: LLMModel) => {
    setModalError(null);
    setModalMode("edit");
    setEditingModelID(model.id);
    setForm({
      provider: model.provider,
      model: model.model,
      display_name: model.display_name,
      temperature_min: String(model.temperature_min),
      temperature_max: String(model.temperature_max),
      max_tokens_min: String(model.max_tokens_min),
      max_tokens_max: String(model.max_tokens_max),
      supports_streaming: model.supports_streaming,
      prompt_cost_per_1m: model.current_pricing
        ? String(model.current_pricing.prompt_cost_per_1m)
        : "",
      completion_cost_per_1m: model.current_pricing
        ? String(model.current_pricing.completion_cost_per_1m)
        : "",
    });
  };

  const parseForm = ():
    | { error: string }
    | {
        data: {
          provider: string;
          model: string;
          display_name: string;
          temperature_min: number;
          temperature_max: number;
          max_tokens_min: number;
          max_tokens_max: number;
          supports_streaming: boolean;
        };
      } => {
    if (!form.model.trim() || !form.display_name.trim()) {
      return { error: "モデルIDと表示名は必須です" };
    }

    const temperatureMin = Number(form.temperature_min);
    const temperatureMax = Number(form.temperature_max);
    const maxTokensMin = Number(form.max_tokens_min);
    const maxTokensMax = Number(form.max_tokens_max);

    if (
      !Number.isFinite(temperatureMin) ||
      !Number.isFinite(temperatureMax) ||
      !Number.isFinite(maxTokensMin) ||
      !Number.isFinite(maxTokensMax)
    ) {
      return { error: "temperature/max_tokens には数値を入力してください" };
    }

    if (temperatureMin < 0 || temperatureMax > 2 || temperatureMin > temperatureMax) {
      return { error: "temperature の範囲が不正です（0 <= min <= max <= 2）" };
    }

    if (
      !Number.isInteger(maxTokensMin) ||
      !Number.isInteger(maxTokensMax) ||
      maxTokensMin < 1 ||
      maxTokensMin > maxTokensMax
    ) {
      return { error: "max_tokens の範囲が不正です（1 <= min <= max）" };
    }

    return {
      data: {
        provider: form.provider,
        model: form.model.trim(),
        display_name: form.display_name.trim(),
        temperature_min: temperatureMin,
        temperature_max: temperatureMax,
        max_tokens_min: maxTokensMin,
        max_tokens_max: maxTokensMax,
        supports_streaming: form.supports_streaming,
      },
    };
  };

  const handleTemperatureInputChange = (
    field: "temperature_min" | "temperature_max",
    rawValue: string,
  ) => {
    if (rawValue === "") {
      setForm((prev) => ({ ...prev, [field]: rawValue }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    setForm((prev) => ({
      ...prev,
      [field]: String(clampTemperature(parsed)),
    }));
  };

  const handleTemperatureSliderChange = (
    field: "temperature_min" | "temperature_max",
    rawValue: string,
  ) => {
    const parsed = clampTemperature(Number(rawValue));
    if (!Number.isFinite(parsed)) return;

    setForm((prev) => {
      const currentMin = Number.isFinite(Number(prev.temperature_min))
        ? clampTemperature(Number(prev.temperature_min))
        : 0;
      const currentMax = Number.isFinite(Number(prev.temperature_max))
        ? clampTemperature(Number(prev.temperature_max))
        : 2;

      if (field === "temperature_min") {
        const nextMin = Math.min(parsed, currentMax);
        return { ...prev, temperature_min: String(nextMin) };
      }

      const nextMax = Math.max(parsed, currentMin);
      return { ...prev, temperature_max: String(nextMax) };
    });
  };

  const handleTokensInputChange = (
    field: "max_tokens_min" | "max_tokens_max",
    rawValue: string,
  ) => {
    if (rawValue === "") {
      setForm((prev) => ({ ...prev, [field]: rawValue }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    setForm((prev) => ({
      ...prev,
      [field]: String(clampTokens(parsed)),
    }));
  };

  const handleTokensSliderChange = (
    field: "max_tokens_min" | "max_tokens_max",
    rawValue: string,
  ) => {
    const parsed = clampTokens(Number(rawValue));
    if (!Number.isFinite(parsed)) return;

    setForm((prev) => {
      const currentMin = Number.isFinite(Number(prev.max_tokens_min))
        ? clampTokens(Number(prev.max_tokens_min))
        : MIN_TOKENS_LIMIT;
      const currentMax = Number.isFinite(Number(prev.max_tokens_max))
        ? clampTokens(Number(prev.max_tokens_max))
        : MAX_TOKENS_LIMIT;

      if (field === "max_tokens_min") {
        const nextMin = Math.min(parsed, currentMax);
        return { ...prev, max_tokens_min: String(nextMin) };
      }

      const nextMax = Math.max(parsed, currentMin);
      return { ...prev, max_tokens_max: String(nextMax) };
    });
  };

  const parsePricing = ():
    | { error: string }
    | { value: { prompt: number; completion: number } | null } => {
    const promptRaw = form.prompt_cost_per_1m.trim();
    const completionRaw = form.completion_cost_per_1m.trim();

    if (promptRaw === "" && completionRaw === "") {
      return { value: null };
    }
    if (promptRaw === "" || completionRaw === "") {
      return { error: "入力単価と出力単価は両方入力してください" };
    }

    const prompt = Number(promptRaw);
    const completion = Number(completionRaw);
    if (
      !Number.isFinite(prompt) ||
      !Number.isFinite(completion) ||
      prompt < 0 ||
      completion < 0
    ) {
      return { error: "単価には0以上の数値を入力してください（USD / 1Mトークン）" };
    }

    return { value: { prompt, completion } };
  };

  const handleSubmitModal = () => {
    if (!modalMode) return;

    const parsed = parseForm();
    if ("error" in parsed) {
      setModalError(parsed.error);
      return;
    }

    const pricingParsed = parsePricing();
    if ("error" in pricingParsed) {
      setModalError(pricingParsed.error);
      return;
    }
    const pricingValue = pricingParsed.value;

    setModalError(null);
    setError(null);
    setSavingModal(modalMode);

    startTransition(async () => {
      if (modalMode === "create") {
        const result = await createLLMModel({
          ...parsed.data,
          ...(pricingValue
            ? {
                initial_prompt_cost_per_1m: pricingValue.prompt,
                initial_completion_cost_per_1m: pricingValue.completion,
              }
            : {}),
        });
        if (!result.success || !result.data) {
          setModalError(result.error || "モデル追加に失敗しました");
          setSavingModal(null);
          return;
        }
        setModels((prev) => [...prev, result.data!]);
        setSavingModal(null);
        handleCloseModal();
        return;
      }

      if (!editingModelID) {
        setModalError("編集対象モデルが見つかりません");
        setSavingModal(null);
        return;
      }

      const editingModel = models.find((entry) => entry.id === editingModelID);

      const result = await updateLLMModel(editingModelID, parsed.data);
      if (!result.success) {
        setModalError(result.error || "モデル編集に失敗しました");
        setSavingModal(null);
        return;
      }

      // 単価の保存（変更時のみ）。既存単価があれば改定（版追加）、無ければ新規登録。
      let nextPricing: LLMPricing | null = editingModel?.current_pricing ?? null;
      if (pricingValue) {
        const current = editingModel?.current_pricing ?? null;
        const changed =
          !current ||
          current.prompt_cost_per_1m !== pricingValue.prompt ||
          current.completion_cost_per_1m !== pricingValue.completion;

        if (changed) {
          if (current) {
            const confirmed = window.confirm(
              "単価を改定します。過去の利用コストには影響しません。続行しますか？",
            );
            if (!confirmed) {
              setSavingModal(null);
              return;
            }
            const reviseResult = await reviseLLMPricing(current.id, {
              prompt_cost_per_1m: pricingValue.prompt,
              completion_cost_per_1m: pricingValue.completion,
            });
            if (!reviseResult.success || !reviseResult.data) {
              setModalError(reviseResult.error || "単価の改定に失敗しました");
              setSavingModal(null);
              return;
            }
            nextPricing = reviseResult.data;
          } else {
            const createResult = await createLLMPricing({
              provider: parsed.data.provider,
              model: parsed.data.model,
              prompt_cost_per_1m: pricingValue.prompt,
              completion_cost_per_1m: pricingValue.completion,
            });
            if (!createResult.success || !createResult.data) {
              setModalError(createResult.error || "単価の登録に失敗しました");
              setSavingModal(null);
              return;
            }
            nextPricing = createResult.data;
          }
        }
      }

      setModels((prev) =>
        prev.map((entry) =>
          entry.id === editingModelID
            ? {
                ...entry,
                provider: parsed.data.provider,
                model: parsed.data.model,
                display_name: parsed.data.display_name,
                temperature_min: parsed.data.temperature_min,
                temperature_max: parsed.data.temperature_max,
                max_tokens_min: parsed.data.max_tokens_min,
                max_tokens_max: parsed.data.max_tokens_max,
                supports_streaming: parsed.data.supports_streaming,
                current_pricing: nextPricing,
              }
            : entry,
        ),
      );
      setSavingModal(null);
      handleCloseModal();
    });
  };

  const temperatureMinValue = Number.isFinite(Number(form.temperature_min))
    ? clampTemperature(Number(form.temperature_min))
    : 0;
  const temperatureMaxValue = Number.isFinite(Number(form.temperature_max))
    ? clampTemperature(Number(form.temperature_max))
    : 2;
  const minPercent = (temperatureMinValue / 2) * 100;
  const maxPercent = (temperatureMaxValue / 2) * 100;
  const tokenMinValue = Number.isFinite(Number(form.max_tokens_min))
    ? clampTokens(Number(form.max_tokens_min))
    : MIN_TOKENS_LIMIT;
  const tokenMaxValue = Number.isFinite(Number(form.max_tokens_max))
    ? clampTokens(Number(form.max_tokens_max))
    : Math.min(8000, MAX_TOKENS_LIMIT);
  const tokenMinPercent = (tokenMinValue / MAX_TOKENS_LIMIT) * 100;
  const tokenMaxPercent = (tokenMaxValue / MAX_TOKENS_LIMIT) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            LLMモデル管理
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            モデルの有効/無効を切り替えます。変更は新しいチャット実行から反映されます。
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            物理削除はデバッグ用途です。本番運用では無効化を優先してください。
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          モデル追加
        </button>
      </div>

      {error && (
        <div className="flex gap-2 items-center p-3 text-red-700 bg-red-50 rounded-lg border border-red-200 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {groupedByProvider.length === 0 ? (
        <div className="p-8 text-sm text-center text-gray-500 bg-white rounded-xl border border-gray-300 border-dashed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          利用可能なLLMモデルがありません。
        </div>
      ) : (
        groupedByProvider.map(([provider, providerModels]) => (
          <section
            key={provider}
            className="p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900"
          >
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              {providerLabel(provider)}
            </h2>
            <div className="space-y-3">
              {providerModels
                .slice()
                .sort((a, b) => a.display_name.localeCompare(b.display_name))
                .map((model) => {
                  const isUpdating = updatingModelID === model.id && isPending;
                  const isDeleting = deletingModelID === model.id && isPending;
                  const isDisabled = !model.is_enabled;
                  const isExpanded = expandedModelIDs.has(model.id);
                  return (
                    <div
                      key={model.id}
                      className={`p-3 rounded-lg border transition ${
                        isDisabled
                          ? "border-gray-300 opacity-70 saturate-50 bg-gray-100/80 dark:border-gray-700 dark:bg-gray-800/70"
                          : "bg-white border-gray-200 dark:border-gray-700 dark:bg-gray-900"
                      }`}
                    >
                      <div className="flex gap-3 justify-between items-center">
                        <div className="flex flex-wrap gap-2 items-center min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isDisabled
                                ? "text-gray-400 dark:text-gray-500"
                                : "text-gray-800 dark:text-gray-100"
                            }`}
                          >
                            {model.display_name}
                          </p>
                          {!model.current_pricing && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              <AlertCircle className="w-3 h-3" />
                              単価未設定
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleModelDetails(model.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          詳細
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 mt-3 space-y-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="space-y-1">
                            <p
                              className={`text-xs ${
                                isDisabled
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              表示名:{" "}
                              <span className="font-medium">{model.display_name}</span>
                            </p>
                            <p
                              className={`text-xs ${
                                isDisabled
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              プロバイダー: {model.provider}
                            </p>
                            <p
                              className={`text-xs ${
                                isDisabled
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              モデルID: {model.model}
                            </p>
                            <p
                              className={`text-xs ${
                                isDisabled
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              Temperature範囲: {model.temperature_min} -{" "}
                              {model.temperature_max}
                            </p>
                            <p
                              className={`text-xs ${
                                isDisabled
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              トークン範囲: {model.max_tokens_min} -{" "}
                              {model.max_tokens_max}
                            </p>
                            <p
                              className={`text-xs ${
                                isDisabled
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              単価 (USD/1M):{" "}
                              {model.current_pricing ? (
                                <span className="font-medium">
                                  入力 ${model.current_pricing.prompt_cost_per_1m} / 出力 $
                                  {model.current_pricing.completion_cost_per_1m}
                                </span>
                              ) : (
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  未設定
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end items-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(model)}
                            disabled={isPending}
                            className="inline-flex min-w-[90px] items-center justify-center rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors duration-150 hover:bg-blue-200 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/70 dark:hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(model)}
                            disabled={isPending}
                            className={`inline-flex min-w-[90px] items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 ${
                              model.is_enabled
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 focus-visible:ring-amber-500 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/70 dark:hover:text-amber-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 focus-visible:ring-green-500 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/70 dark:hover:text-green-200"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : model.is_enabled ? (
                              "無効化"
                            ) : (
                              "有効化"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(model)}
                            disabled={isPending}
                            className="inline-flex min-w-[90px] items-center justify-center rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-200 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/70 dark:hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title="デバッグ用途の物理削除"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "削除"
                            )}
                          </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))
      )}

      <ModalOverlay
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        closeOnEscape={false}
      >
          <div
            className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-2xl dark:bg-gray-900 md:rounded-3xl dark:border-gray-700"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative px-4 pt-6 pb-4 md:px-8 md:pt-8 md:pb-6">
              <button
                onClick={handleCloseModal}
                disabled={isPending}
                className="absolute top-4 md:top-6 right-4 md:right-6 p-1.5 md:p-2 text-gray-400 rounded-full transition-colors hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <h2 className="text-lg font-bold text-gray-900 md:text-2xl dark:text-white">
                {modalMode === "create" ? "LLMモデルを追加" : "LLMモデルを編集"}
              </h2>
              <p className="mt-1 text-xs text-gray-600 md:text-sm dark:text-gray-400">
                provider / model / 表示名 / 範囲 / ストリーミング設定を編集できます
              </p>
            </div>

            <div className="px-4 pb-6 space-y-4 md:px-8 md:pb-8">
              {modalError && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 md:p-4 md:rounded-xl dark:bg-red-900/20 dark:border-red-800">
                  <p className="text-xs text-red-600 md:text-sm dark:text-red-400">
                    {modalError}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">
                    プロバイダー
                  </label>
                  <select
                    value={form.provider}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, provider: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">
                    モデルID
                  </label>
                  <input
                    value={form.model}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, model: e.target.value }))
                    }
                    placeholder="model id (例: gpt-4.1)"
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">
                    表示名
                  </label>
                  <input
                    value={form.display_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, display_name: e.target.value }))
                    }
                    placeholder="表示名 (例: GPT-4.1)"
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div className="p-3 space-y-2 rounded-lg border border-gray-300 dark:border-gray-700 md:col-span-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Temperature範囲
                  </p>
                  <div className="relative py-3">
                    <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-500"
                      style={{
                        left: `${minPercent}%`,
                        right: `${100 - maxPercent}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperatureMinValue}
                      onChange={(e) =>
                        handleTemperatureSliderChange(
                          "temperature_min",
                          e.target.value,
                        )
                      }
                      className="dual-range absolute inset-0 z-20 w-full h-full"
                    />
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperatureMaxValue}
                      onChange={(e) =>
                        handleTemperatureSliderChange(
                          "temperature_max",
                          e.target.value,
                        )
                      }
                      className="dual-range absolute inset-0 z-30 w-full h-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={form.temperature_min}
                      onChange={(e) =>
                        handleTemperatureInputChange(
                          "temperature_min",
                          e.target.value,
                        )
                      }
                      placeholder="temperature min"
                      className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={form.temperature_max}
                      onChange={(e) =>
                        handleTemperatureInputChange(
                          "temperature_max",
                          e.target.value,
                        )
                      }
                      placeholder="temperature max"
                      className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    現在値: {temperatureMinValue.toFixed(1)} -{" "}
                    {temperatureMaxValue.toFixed(1)}
                  </p>
                </div>
                <div className="p-3 space-y-2 rounded-lg border border-gray-300 dark:border-gray-700 md:col-span-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    トークン範囲
                  </p>
                  <div className="relative py-3">
                    <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-500"
                      style={{
                        left: `${tokenMinPercent}%`,
                        right: `${100 - tokenMaxPercent}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={MIN_TOKENS_LIMIT}
                      max={MAX_TOKENS_LIMIT}
                      step={1}
                      value={tokenMinValue}
                      onChange={(e) =>
                        handleTokensSliderChange("max_tokens_min", e.target.value)
                      }
                      className="dual-range absolute inset-0 z-20 w-full h-full"
                    />
                    <input
                      type="range"
                      min={MIN_TOKENS_LIMIT}
                      max={MAX_TOKENS_LIMIT}
                      step={1}
                      value={tokenMaxValue}
                      onChange={(e) =>
                        handleTokensSliderChange("max_tokens_max", e.target.value)
                      }
                      className="dual-range absolute inset-0 z-30 w-full h-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="number"
                      min={MIN_TOKENS_LIMIT}
                      step={1}
                      value={form.max_tokens_min}
                      onChange={(e) =>
                        handleTokensInputChange("max_tokens_min", e.target.value)
                      }
                      placeholder="max_tokens min"
                      className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                    <input
                      type="number"
                      min={MIN_TOKENS_LIMIT}
                      step={1}
                      value={form.max_tokens_max}
                      onChange={(e) =>
                        handleTokensInputChange("max_tokens_max", e.target.value)
                      }
                      placeholder="max_tokens max"
                      className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    現在値: {tokenMinValue} - {tokenMaxValue}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.supports_streaming}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        supports_streaming: e.target.checked,
                      }))
                    }
                  />
                  ストリーミング対応
                </label>

                <div className="p-3 space-y-3 rounded-lg border border-gray-300 dark:border-gray-700 md:col-span-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      単価（USD / 1Mトークン）
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {modalMode === "edit"
                        ? "変更すると新しい単価として改定されます（過去の利用コストには影響しません）。"
                        : "任意。設定するとコスト集計に反映されます。"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500 dark:text-gray-400">
                        入力単価（prompt）
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={form.prompt_cost_per_1m}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            prompt_cost_per_1m: e.target.value,
                          }))
                        }
                        placeholder="例: 2.50"
                        className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500 dark:text-gray-400">
                        出力単価（completion）
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={form.completion_cost_per_1m}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            completion_cost_per_1m: e.target.value,
                          }))
                        }
                        placeholder="例: 10.00"
                        className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 flex justify-end -mx-4 md:-mx-8 -mb-6 md:-mb-8 mt-2 px-4 py-3 md:px-8 md:py-4 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-b-2xl md:rounded-b-3xl">
                <button
                  onClick={handleSubmitModal}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-green-500 rounded-xl shadow-lg transition-all hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-green-500/30"
                >
                  {savingModal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>保存</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
      </ModalOverlay>
      <style jsx>{`
        .dual-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
        }

        .dual-range::-webkit-slider-runnable-track {
          height: 0;
          background: transparent;
        }

        .dual-range::-moz-range-track {
          height: 0;
          background: transparent;
          border: 0;
        }

        .dual-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #16a34a;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          pointer-events: auto;
        }

        .dual-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #16a34a;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}
