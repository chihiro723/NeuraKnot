/**
 * Analytics用の統一ツールチップコンポーネント
 * 全てのグラフで一貫したデザインを提供
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    dataKey?: string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      {label && (
        <p className="text-sm font-semibold text-gray-900 mb-2 dark:text-white">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div
            key={`item-${index}`}
            className="flex justify-between items-center gap-4"
          >
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {entry.name || entry.dataKey}:
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

