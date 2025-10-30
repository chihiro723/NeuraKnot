"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { useIsMobile } from "@/lib/hooks/useResponsive";
import {
  listServices,
  getUserServicesWithDetails,
  getServiceTools,
} from "@/lib/actions/services";
import type {
  Service,
  ServiceConfig,
  UserServiceWithDetails,
  Tool,
} from "@/lib/types/service";
import { ServiceCard } from "./ServiceCard";
import { ServiceRegistrationModal } from "./ServiceRegistrationModal";

interface ServiceRegistrationFormProps {
  onSuccess?: (config: ServiceConfig) => void;
  onCancel?: () => void;
  availableServices?: Service[];
}

/**
 * サービス登録フォームコンポーネント
 */
export function ServiceRegistrationForm({
  onSuccess,
  onCancel,
  availableServices,
}: ServiceRegistrationFormProps = {}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userServices, setUserServices] = useState<UserServiceWithDetails[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [serviceTools, setServiceTools] = useState<Record<string, Tool[]>>({});

  // サービス一覧とユーザーサービスを取得
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // 利用可能なサービス一覧を取得
        const servicesData = availableServices || (await listServices());
        setServices(servicesData || []);

        // ユーザーが既に登録しているサービスを取得
        const userServicesData = await getUserServicesWithDetails();
        setUserServices((userServicesData || []) as UserServiceWithDetails[]);

        // 各サービスのツール一覧を事前に取得
        const toolsMap: Record<string, Tool[]> = {};
        for (const service of servicesData || []) {
          try {
            const tools = await getServiceTools(service.class_name);
            toolsMap[service.class_name] = tools || [];
          } catch (err) {
            console.error(
              `Failed to load tools for ${service.class_name}:`,
              err
            );
            toolsMap[service.class_name] = [];
          }
        }
        setServiceTools(toolsMap);
      } catch (err) {
        console.error("Failed to load services:", err);
        setServices([]);
        setUserServices([]);
        setServiceTools({});
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [availableServices]);

  // サービスカードをクリック
  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  // 登録成功時の処理
  const handleRegistrationSuccess = (config: ServiceConfig) => {
    setIsModalOpen(false);
    setSelectedService(null);

    if (onSuccess) {
      onSuccess(config);
    } else {
      // マイサービス管理に遷移
      router.push(`/dashboard/services/my-services`);
    }
  };

  // 既に登録済みのサービスのclass_nameを取得
  const registeredServiceNames = userServices.map(
    (us) => us.service.class_name
  );

  // サービスが登録済みかどうかを判定
  const isServiceRegistered = (service: Service) => {
    return registeredServiceNames.includes(service.class_name);
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/dashboard/services");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex justify-between items-center h-16 px-4 bg-white border-b border-gray-200 md:h-16 md:px-6 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
            <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              サービス登録
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              カタログからサービスを選択
            </p>
          </div>
        </div>
        {/* 戻るボタン（モバイルのみ、右側に配置） */}
        {isMobile && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center p-2 text-gray-600 bg-gray-50/80 transition-all duration-200 dark:text-gray-300 dark:bg-gray-800/50 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 rounded-lg"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* サービスカードグリッド */}
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex flex-1 justify-center items-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-4 md:p-6">
            <div className="grid grid-cols-3 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.map((service) => {
                const isRegistered = isServiceRegistered(service);
                const needsAuth =
                  service.auth_schema &&
                  Object.keys(service.auth_schema.properties || {}).length > 0;

                return (
                  <ServiceCard
                    key={service.class_name}
                    service={service}
                    onClick={() => {
                      if (!isRegistered) {
                        handleServiceClick(service);
                      }
                    }}
                    isDisabled={isRegistered}
                    requiresAuth={needsAuth}
                    isUnlocked={isRegistered}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 登録モーダル */}
      <ServiceRegistrationModal
        service={selectedService}
        tools={
          selectedService ? serviceTools[selectedService.class_name] || [] : []
        }
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedService(null);
        }}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}
