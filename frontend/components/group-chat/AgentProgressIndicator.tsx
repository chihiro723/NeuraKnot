'use client';

import { CheckCircle, Loader2, Clock } from 'lucide-react';

export interface MentionProgress {
  agent_id: string;
  agent_name: string;
  agent_icon?: string;
  order: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

interface AgentProgressIndicatorProps {
  mentions: MentionProgress[];
}

export function AgentProgressIndicator({ mentions }: AgentProgressIndicatorProps) {
  if (mentions.length === 0) return null;

  const allCompleted = mentions.every(m => m.status === 'completed');
  if (allCompleted) return null;

  return (
    <div className="bg-muted/50 border-b p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">エージェントが順番に応答中...</span>
      </div>
      <div className="flex items-center space-x-2 mt-2 overflow-x-auto">
        {mentions.map((mention, index) => (
          <div key={mention.agent_id} className="flex items-center space-x-1">
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs ${
                mention.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : mention.status === 'processing'
                  ? 'bg-blue-100 text-blue-700'
                  : mention.status === 'failed' || mention.status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {mention.status === 'completed' && (
                <CheckCircle className="w-3 h-3" />
              )}
              {mention.status === 'processing' && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              {mention.status === 'pending' && (
                <Clock className="w-3 h-3" />
              )}
              <span>{mention.agent_name}</span>
            </div>
            {index < mentions.length - 1 && (
              <span className="text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
