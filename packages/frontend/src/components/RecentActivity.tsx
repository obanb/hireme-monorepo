'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface RecentReservation {
  id: string;
  guestName: string | null;
  status: string;
  checkInDate: string | null;
  createdAt: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CONFIRMED: { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  label: 'Confirmed' },
  CANCELLED: { color: '#FB7185', bg: 'rgba(251,113,133,0.1)', label: 'Cancelled' },
  PENDING:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  label: 'Pending' },
};

function getStatus(s: string) {
  return STATUS_CONFIG[s] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: s };
}

export default function RecentActivity() {
  const [items, setItems] = useState<RecentReservation[]>([]);
  const { t } = useLocale();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `{ reservations(limit: 8) { id guestName status checkInDate createdAt } }`,
          }),
        });
        const json = await res.json();
        if (json.data?.reservations) setItems(json.data.reservations);
      } catch {
        // keep empty
      }
    })();
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--card-border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        <h2
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {t('activity.title')}
        </h2>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Recent
        </span>
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t('activity.noActivity')}
          </p>
        </div>
      ) : (
        <div>
          {items.map((r, i) => {
            const st = getStatus(r.status);
            const initials = r.guestName
              ? r.guestName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
              : '?';
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 transition-colors"
                style={{
                  padding: '12px 20px',
                  borderBottom: i < items.length - 1 ? '1px solid var(--card-border)' : 'none',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                  style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-medium leading-none mb-[3px] truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {r.guestName || 'Unknown guest'}
                  </p>
                  <p className="text-[11px] leading-none truncate" style={{ color: 'var(--text-muted)' }}>
                    {r.checkInDate ? `Check-in ${r.checkInDate}` : 'No check-in date'}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md flex-shrink-0"
                  style={{ color: st.color, background: st.bg }}
                >
                  {st.label}
                </span>

                {/* Time */}
                <span
                  className="text-[11px] tabular-nums flex-shrink-0 w-8 text-right"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {r.createdAt ? timeAgo(r.createdAt) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
