"use client";

import { useState, useEffect } from "react";
import { ServiceCard } from "./ServiceCard";
import { ServiceDetailModal } from "./ServiceDetailModal";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { showToast } from "@/components/ui/ToastContainer";
import {
  getUserServicesWithDetails,
  toggleServiceEnabled,
  deleteServiceConfig,
} from "@/lib/actions/services";
import type {
  Service,
  Tool,
  ServiceConfig,
  UserServiceWithDetails,
} from "@/lib/types/service";

/**
 * サービス一覧コンポーネント
 * ユーザーが登録したサービスをカードグリッドで表示
 */
export function ServiceList() {
  const [userServices, setUserServices] = useState<UserServiceWithDetails[]>(
    []
  );
  const [selectedService, setSelectedService] = useState<{
    service: Service;
    config: ServiceConfig;
    tools: Tool[];
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // サービス一覧を読み込み
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const services = await getUserServicesWithDetails();
      setUserServices((services || []) as UserServiceWithDetails[]);
      setError("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "サービス一覧の取得に失敗しました"
      );
      setUserServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // サービスカードをクリック
  const handleServiceClick = async (userService: UserServiceWithDetails) => {
    setSelectedService({
      service: userService.service,
      config: userService.config,
      tools: userService.tools,
    });
    setIsModalOpen(true);
  };

  // サービスを有効化/無効化
  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await toggleServiceEnabled(id, enabled);
      await loadServices();

      // モーダルの情報も更新
      if (selectedService && selectedService.config.id === id) {
        setSelectedService({
          ...selectedService,
          config: { ...selectedService.config, is_enabled: enabled },
        });
      }
    } catch (err: unknown) {
      showToast({
        message:
          err instanceof Error ? err.message : "状態の変更に失敗しました",
        type: "error",
        duration: 5000,
      });
    }
  };

  // サービスを削除
  const handleDelete = async (id: string) => {
    try {
      await deleteServiceConfig(id);
      await loadServices();
      setIsModalOpen(false);
    } catch (err: unknown) {
      showToast({
        message: err instanceof Error ? err.message : "削除に失敗しました",
        type: "error",
        duration: 5000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center min-h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200 dark:bg-red-500/10 dark:border-red-500/20">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (!userServices || userServices.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 h-64">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            登録されているサービスはありません
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            新規登録ページからサービスを追加してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* サービスカードグリッド */}
      <div className="grid grid-cols-3 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {userServices.map((userService) => (
          <ServiceCard
            key={userService.config.id}
            service={userService.service}
            onClick={() => handleServiceClick(userService)}
            isUnlocked={userService.config.is_enabled}
          />
        ))}
      </div>

      {/* 詳細モーダル */}
      {selectedService && (
        <ServiceDetailModal
          service={selectedService.service}
          config={selectedService.config}
          tools={selectedService.tools}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onToggleEnabled={handleToggleEnabled}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
