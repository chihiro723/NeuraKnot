'use client';

import { GroupMessage as GroupMessageType } from '@/lib/api/group-chat';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolUsageDisplay } from '../chat/ToolUsageDisplay';

interface GroupMessageProps {
  message: GroupMessageType;
  isStreaming?: boolean;
}

export function GroupMessage({ message, isStreaming }: GroupMessageProps) {
  const isUser = message.sender_type === 'user';

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* アバター */}
      <div className="flex-shrink-0">
        {message.sender_icon ? (
          <img
            src={message.sender_icon}
            alt={message.sender_name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary/10' : 'bg-muted'
          }`}>
            {isUser ? (
              <User className="w-5 h-5 text-primary" />
            ) : (
              <Bot className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* メッセージ本体 */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-semibold">{message.sender_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ja,
            })}
          </span>
          {message.processing_status === 'processing' && (
            <span className="text-xs text-blue-600">処理中...</span>
          )}
          {message.processing_status === 'failed' && (
            <span className="text-xs text-destructive">失敗</span>
          )}
          {message.processing_status === 'cancelled' && (
            <span className="text-xs text-muted-foreground">キャンセル</span>
          )}
        </div>

        <div
          className={`rounded-lg p-3 ${
            isUser
              ? 'bg-primary text-primary-foreground inline-block max-w-[80%]'
              : 'bg-muted'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">▋</span>
              )}
            </div>
              
              {/* ツール使用情報を表示 */}
              {message.tool_usages && message.tool_usages.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.tool_usages.map((toolUsage) => (
                    <ToolUsageDisplay
                      key={toolUsage.id}
                      tool={{
                        tool_id: toolUsage.id,
                        tool_name: toolUsage.tool_name,
                        status: toolUsage.status as 'running' | 'completed' | 'failed',
                        input: toolUsage.input_data,
                        output: toolUsage.output_data || null,
                        error: toolUsage.error_message || null,
                        execution_time_ms: toolUsage.execution_time_ms || null,
                        insertPosition: toolUsage.insert_position || null,
                        expanded: false,
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
