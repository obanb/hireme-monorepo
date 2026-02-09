'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat, ChatMessage, ToolCallInfo } from '../../hooks/useChat';

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ToolCallBadge({ tool }: { tool: ToolCallInfo }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-xs text-stone-600 border border-stone-200">
      <span
        className={`w-2 h-2 rounded-full ${
          tool.status === 'running'
            ? 'bg-amber-400 animate-pulse'
            : tool.status === 'error'
            ? 'bg-red-400'
            : 'bg-lime-400'
        }`}
      />
      <span className="font-mono">{tool.tool}</span>
      {tool.status === 'running' && <span className="text-stone-400">running...</span>}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs border border-amber-200">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={`${tc.tool}-${i}`} tool={tc} />
            ))}
          </div>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-stone-900 text-white rounded-br-md'
              : 'bg-white text-stone-800 border border-stone-200 shadow-sm rounded-bl-md'
          }`}
        >
          {message.content}
          {message.isStreaming && !message.content && (
            <span className="inline-flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <div className={`text-[10px] text-stone-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isConnected, isLoading, sendMessage, clearMessages } = useChat();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      {/* Floating bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-stone-900 text-white shadow-lg shadow-stone-900/30 flex items-center justify-center z-50 hover:bg-stone-800 transition-colors"
          >
            <span className="text-xl">✦</span>
            {!isConnected && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-400 border-2 border-white" />
            )}
            {isConnected && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-lime-400 border-2 border-white" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-stone-50 rounded-2xl shadow-2xl shadow-stone-900/20 flex flex-col overflow-hidden z-50 border border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center">
                  <span className="text-lime-400 text-sm">✦</span>
                </div>
                <div>
                  <h3 className="text-stone-900 font-semibold text-sm">AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-lime-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-stone-400 text-xs">
                      {isConnected ? 'Online' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearMessages}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-600 text-xs"
                  title="Clear chat"
                >
                  ⟲
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-600"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-stone-200 flex items-center justify-center mb-4">
                    <span className="text-2xl text-stone-400">✦</span>
                  </div>
                  <p className="text-stone-500 text-sm font-medium mb-1">Hotel CMS Assistant</p>
                  <p className="text-stone-400 text-xs leading-relaxed">
                    Ask me about reservations, rooms, rates, or anything about your hotel operations.
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-stone-200">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={isConnected ? 'Ask something...' : 'Connecting...'}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !isConnected}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isLoading ? '...' : '→'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
