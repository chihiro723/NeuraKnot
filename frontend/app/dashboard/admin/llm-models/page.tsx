import { listLLMModels } from "@/lib/actions/llm-models";
import { LLMModelsAdminModalClient } from "@/components/admin/LLMModelsAdminModalClient";

export const dynamic = "force-dynamic";

export default async function LLMModelsAdminPage() {
  const response = await listLLMModels(undefined, false);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950">
      <LLMModelsAdminModalClient initialModels={response.models} />
    </div>
  );
}
