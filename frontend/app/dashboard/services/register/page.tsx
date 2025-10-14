"use client";

import { useRouter } from "next/navigation";
import { ServiceRegistrationForm } from "@/components/services/ServiceRegistrationForm";
import type { ServiceConfig } from "@/lib/types/service";

/**
 * サービス新規登録ページ
 * 新しいサービスを登録
 */
export default function RegisterServicePage() {
  const router = useRouter();

  const handleSuccess = async (config: ServiceConfig) => {
    // マイサービスページへリダイレクト（ハイライト付き）
    router.push(`/dashboard/services/my-services?highlight=${config.id}`);
  };

  return <ServiceRegistrationForm onSuccess={handleSuccess} />;
}
