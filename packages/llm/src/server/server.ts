import { createServer, Server } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { getMcpClient, closeMcpClient } from '../mcp/mcp-client';
import { getOrCreateSession, getSession, handleChatMessage } from '../chat/service';
import { initializeRagDatabase, startIndexer, stopIndexer, closeRagPool } from '../rag';

export type ServerStatus =
  | { isAlive: false; server: undefined }
  | { isAlive: true; server: Server };

let serverStatus: ServerStatus = { isAlive: false, server: undefined };

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`[socket.io] Client connected: ${socket.id}`);

  const session = getOrCreateSession();
  socket.emit('chat:session', { sessionId: session.id });

  socket.on('chat:message', async (data: { message: string; sessionId?: string }) => {
    const chatSession = data.sessionId
      ? getOrCreateSession(data.sessionId)
      : session;

    await handleChatMessage(chatSession, data.message, {
      onStart: () => {
        socket.emit('chat:start');
      },
      onChunk: (chunk: string) => {
        socket.emit('chat:chunk', { chunk });
      },
      onEnd: (fullMessage: string) => {
        socket.emit('chat:end', { message: fullMessage });
      },
      onToolStart: (toolName: string, args: Record<string, any>) => {
        socket.emit('chat:tool:start', { tool: toolName, args });
      },
      onToolResult: (toolName: string, result: any) => {
        socket.emit('chat:tool:result', { tool: toolName, result });
      },
      onError: (error: string) => {
        socket.emit('chat:error', { error });
      },
    });
  });

  socket.on('chat:history', (data: { sessionId: string }) => {
    const s = getSession(data.sessionId);
    if (s) {
      socket.emit('chat:history', { sessionId: s.id, messages: s.messages });
    } else {
      socket.emit('chat:error', { error: 'Session not found' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[socket.io] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await getMcpClient();
    console.log('[server] MCP client initialized');
  } catch (error) {
    console.error('[server] Failed to initialize MCP client:', error);
    console.error('[server] Chat will not have tool access until MCP server is available');
  }

  if (config.rag.enabled) {
    try {
      await initializeRagDatabase();
      startIndexer();
      console.log('[server] RAG system initialized');
    } catch (error) {
      console.error('[server] Failed to initialize RAG system:', error);
      console.error('[server] Chat will work without RAG context');
    }
  }

  serverStatus = await new Promise<ServerStatus>((resolve) => {
    httpServer.listen(config.port, () => {
      console.log(`[server] LLM service running at http://localhost:${config.port}`);
      console.log(`[server] Socket.IO ready for connections`);
      resolve({ isAlive: true, server: httpServer });
    });
  });
};

const shutdown = async () => {
  console.log('[server] Shutting down...');
  stopIndexer();
  await closeMcpClient();
  await closeRagPool();
  io.close();
  httpServer.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export const server = {
  startServer,
  serverStatus,
};
