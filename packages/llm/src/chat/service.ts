import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { listMcpTools, callMcpTool } from '../mcp/mcp-client';
import { ChatMessage, ChatSession, StreamCallbacks } from './types';
import { SYSTEM_PROMPT } from './prompts';
import { searchSimilar } from '../rag/search';

const sessions = new Map<string, ChatSession>();

const openai = new OpenAI({
  baseURL: config.llm.baseUrl,
  apiKey: config.llm.apiKey,
});

export function getOrCreateSession(sessionId?: string): ChatSession {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const id = sessionId || uuidv4();
  const session: ChatSession = {
    id,
    messages: [],
    createdAt: new Date(),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): ChatSession | undefined {
  return sessions.get(sessionId);
}

function mcpToolsToOpenAIFormat(tools: any[]): OpenAI.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema || { type: 'object', properties: {} },
    },
  }));
}

const MAX_TOOL_ITERATIONS = 5;

async function buildAugmentedSystemPrompt(userMessage: string): Promise<string> {
  if (!config.rag.enabled) return SYSTEM_PROMPT;

  try {
    const results = await searchSimilar(userMessage);
    if (results.length === 0) return SYSTEM_PROMPT;

    const contextBlock = results
      .map((r) => `- [${r.entityType}] ${r.content} (similarity: ${r.similarity.toFixed(2)})`)
      .join('\n');

    return `${SYSTEM_PROMPT}\n\n## Relevant Hotel Data Context\nThe following data may be relevant to the user's query:\n${contextBlock}`;
  } catch (error) {
    console.warn('[rag] Failed to build augmented prompt:', error);
    return SYSTEM_PROMPT;
  }
}

export async function handleChatMessage(
  session: ChatSession,
  userMessage: string,
  callbacks: StreamCallbacks
): Promise<void> {
  session.messages.push({ role: 'user', content: userMessage });

  try {
    let openaiTools: OpenAI.ChatCompletionTool[] = [];
    try {
      const mcpTools = await listMcpTools();
      openaiTools = mcpToolsToOpenAIFormat(mcpTools);
    } catch {
      console.warn('[chat] MCP tools unavailable, continuing without tools');
    }

    let iterations = 0;
    const augmentedPrompt = await buildAugmentedSystemPrompt(userMessage);

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const systemPrompt = iterations === 1 ? augmentedPrompt : SYSTEM_PROMPT;
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...session.messages.map(msgToOpenAI),
      ];

      callbacks.onStart();

      const stream = await openai.chat.completions.create({
        model: config.llm.model,
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        max_tokens: config.llm.maxTokens,
        temperature: config.llm.temperature,
        stream: true,
      });

      let fullContent = '';
      let toolCalls: Array<{
        id: string;
        function: { name: string; arguments: string };
      }> = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          fullContent += delta.content;
          callbacks.onChunk(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index;
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: tc.id || '',
                function: { name: '', arguments: '' },
              };
            }
            if (tc.id) toolCalls[index].id = tc.id;
            if (tc.function?.name) toolCalls[index].function.name += tc.function.name;
            if (tc.function?.arguments) toolCalls[index].function.arguments += tc.function.arguments;
          }
        }
      }

      if (toolCalls.length > 0) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: fullContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: tc.function,
          })),
        };
        session.messages.push(assistantMsg);

        for (const tc of toolCalls) {
          const toolName = tc.function.name;
          let toolArgs: Record<string, any>;
          try {
            toolArgs = JSON.parse(tc.function.arguments);
          } catch {
            toolArgs = {};
          }

          callbacks.onToolStart(toolName, toolArgs);

          try {
            const result = await callMcpTool(toolName, toolArgs);
            const resultText = result.content
              ?.map((c: any) => c.text)
              .join('\n') || JSON.stringify(result);

            // Detect navigation action from navigate_to tool
            try {
              const parsed = JSON.parse(resultText);
              if (parsed.__action === 'navigate' && parsed.path) {
                callbacks.onNavigate(parsed.path);
              }
            } catch {
              // Not JSON or no navigation action — ignore
            }

            callbacks.onToolResult(toolName, resultText);

            session.messages.push({
              role: 'tool',
              content: resultText,
              tool_call_id: tc.id,
            });
          } catch (error) {
            const errorMsg = `Tool error: ${error}`;
            callbacks.onToolResult(toolName, errorMsg);
            session.messages.push({
              role: 'tool',
              content: errorMsg,
              tool_call_id: tc.id,
            });
          }
        }

        continue;
      }

      session.messages.push({ role: 'assistant', content: fullContent });
      callbacks.onEnd(fullContent);
      return;
    }

    callbacks.onError('Maximum tool call iterations reached');
  } catch (error) {
    callbacks.onError(`Chat error: ${error}`);
  }
}

function msgToOpenAI(msg: ChatMessage): OpenAI.ChatCompletionMessageParam {
  if (msg.role === 'tool') {
    return {
      role: 'tool',
      content: msg.content || '',
      tool_call_id: msg.tool_call_id || '',
    };
  }
  if (msg.role === 'assistant' && msg.tool_calls) {
    return {
      role: 'assistant',
      content: msg.content,
      tool_calls: msg.tool_calls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: tc.function,
      })),
    };
  }
  return {
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content || '',
  };
}
