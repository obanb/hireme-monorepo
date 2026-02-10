export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export interface StreamCallbacks {
  onStart: () => void;
  onChunk: (chunk: string) => void;
  onEnd: (fullMessage: string) => void;
  onToolStart: (toolName: string, args: Record<string, any>) => void;
  onToolResult: (toolName: string, result: any) => void;
  onNavigate: (path: string) => void;
  onError: (error: string) => void;
}
