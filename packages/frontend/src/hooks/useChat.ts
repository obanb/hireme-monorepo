'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const LLM_URL = process.env.NEXT_PUBLIC_LLM_URL || 'http://localhost:4010';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  tool: string;
  args?: Record<string, unknown>;
  result?: string;
  status: 'running' | 'done' | 'error';
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamingRef = useRef<string>('');

  useEffect(() => {
    const socket = io(LLM_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat:session', (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
    });

    socket.on('chat:start', () => {
      streamingRef.current = '';
      const streamMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, streamMsg]);
    });

    socket.on('chat:chunk', (data: { chunk: string }) => {
      streamingRef.current += data.chunk;
      const currentContent = streamingRef.current;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: currentContent }];
        }
        return prev;
      });
    });

    socket.on('chat:end', (data: { message: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: data.message, isStreaming: false }];
        }
        return prev;
      });
      setIsLoading(false);
    });

    socket.on('chat:tool:start', (data: { tool: string; args: Record<string, unknown> }) => {
      const toolInfo: ToolCallInfo = { tool: data.tool, args: data.args, status: 'running' };
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          const toolCalls = [...(last.toolCalls || []), toolInfo];
          return [...prev.slice(0, -1), { ...last, toolCalls }];
        }
        // No assistant message yet — create one with tool info
        return [
          ...prev,
          {
            id: `assistant-tool-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
            toolCalls: [toolInfo],
          },
        ];
      });
    });

    socket.on('chat:tool:result', (data: { tool: string; result: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.toolCalls) {
          const toolCalls = last.toolCalls.map((tc) =>
            tc.tool === data.tool && tc.status === 'running'
              ? { ...tc, result: data.result, status: 'done' as const }
              : tc
          );
          return [...prev.slice(0, -1), { ...last, toolCalls }];
        }
        return prev;
      });
    });

    socket.on('chat:error', (data: { error: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: `Error: ${data.error}`, isStreaming: false },
          ];
        }
        return [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: `Error: ${data.error}`,
            timestamp: new Date(),
          },
        ];
      });
      setIsLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !socketRef.current) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      socketRef.current.emit('chat:message', {
        message: content.trim(),
        sessionId,
      });
    },
    [sessionId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
  };
}
