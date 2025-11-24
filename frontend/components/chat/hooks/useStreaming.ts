import { useState, useRef } from "react";
import type { ToolUsageData } from "@/lib/types";

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingTools, setStreamingTools] = useState<ToolUsageData[]>([]);
  const streamingContentRef = useRef(""); // ストリーミング内容の最新値を追跡
  
  // グループチャット用、または1対1チャットでのエージェント情報表示用
  const [streamingAgentName, setStreamingAgentName] = useState<string>("");
  const [streamingAgentIcon, setStreamingAgentIcon] = useState<string>("");

  const resetStreaming = () => {
    setIsStreaming(false);
    setStreamingContent("");
    setStreamingTools([]);
    streamingContentRef.current = "";
    setStreamingAgentName("");
    setStreamingAgentIcon("");
  };

  const startStreaming = () => {
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingTools([]);
    streamingContentRef.current = "";
  };

  return {
    isStreaming,
    setIsStreaming,
    streamingContent,
    setStreamingContent,
    streamingTools,
    setStreamingTools,
    streamingContentRef,
    streamingAgentName,
    setStreamingAgentName,
    streamingAgentIcon,
    setStreamingAgentIcon,
    resetStreaming,
    startStreaming,
  };
}
