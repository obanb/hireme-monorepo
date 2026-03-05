'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = { opts: ConfirmOptions; resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => setPending({ opts, resolve }));
  }, []);

  const handle = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9998, padding: 16,
          }}
          onClick={() => handle(false)}
        >
          <div
            style={{
              background: 'var(--sidebar-bg)',
              borderRadius: 14,
              width: '100%', maxWidth: 380,
              border: '1px solid var(--card-border)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px 16px' }}>
              {pending.opts.title && (
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, margin: '0 0 8px' }}>
                  {pending.opts.title}
                </h3>
              )}
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {pending.opts.message}
              </p>
            </div>
            <div style={{
              padding: '12px 24px 20px',
              display: 'flex', gap: 8, justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => handle(false)}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  border: '1px solid var(--card-border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handle(true)}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: pending.opts.danger ? '#FB7185' : 'var(--gold)',
                  color: pending.opts.danger ? '#fff' : '#1a1a14',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {pending.opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
