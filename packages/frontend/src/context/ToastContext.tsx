'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const COLORS: Record<ToastType, { color: string; border: string }> = {
  success: { color: '#4ADE80', border: 'rgba(74,222,128,0.3)' },
  error:   { color: '#FB7185', border: 'rgba(251,113,133,0.3)' },
  info:    { color: '#60B8D4', border: 'rgba(96,184,212,0.3)' },
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

function ToastStack({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: 'var(--sidebar-bg)',
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.color}`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 240,
              maxWidth: 380,
              boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.2s ease',
            }}
          >
            <span style={{ color: c.color, fontWeight: 700, fontSize: 14, flexShrink: 0, lineHeight: 1 }}>
              {ICONS[t.type]}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, flex: 1, lineHeight: 1.4 }}>
              {t.message}
            </span>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
                pointerEvents: 'auto', flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const toast = {
    success: (msg: string) => add(msg, 'success'),
    error:   (msg: string) => add(msg, 'error'),
    info:    (msg: string) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
