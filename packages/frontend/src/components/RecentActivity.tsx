'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface RecentReservation {
  id: string;
  guestName: string | null;
  status: string;
  checkInDate: string | null;
  roomId: string | null;
  createdAt: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
            query: `{ reservations(limit: 8) { id guestName status checkInDate roomId createdAt } }`,
          }),
        });
        const json = await res.json();
        if (json.data?.reservations) setItems(json.data.reservations);
      } catch {
        // keep empty
      }
    })();
  }, []);

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6">
        <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-4">{t('activity.title')}</h2>
        <p className="text-stone-400 text-center py-8">{t('activity.noActivity')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6">
      <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-4">{t('activity.title')}</h2>
      <div className="space-y-4">
        {items.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-stone-700 rounded-2xl hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              r.status === 'CONFIRMED' ? 'bg-lime-100 text-lime-700' :
              r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              <span className="text-lg">
                {r.status === 'CONFIRMED' ? '◈' : r.status === 'CANCELLED' ? '◇' : '◎'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-900 dark:text-stone-100">{r.guestName || 'Unknown guest'}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {r.status} {r.checkInDate ? `- Check-in ${r.checkInDate}` : ''}
              </p>
            </div>
            <div className="text-sm text-stone-400">
              {r.createdAt ? timeAgo(r.createdAt) : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
