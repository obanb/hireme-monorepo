'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface Stats {
  totalBookings: number;
  occupancyRate: number;
  totalRevenue: number;
  pendingCount: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `{
              reservationStats { totalCount pendingCount totalRevenue }
              roomOccupancyStats { occupancyRate }
            }`,
          }),
        });
        const json = await res.json();
        if (json.data) {
          setStats({
            totalBookings: json.data.reservationStats.totalCount,
            pendingCount: json.data.reservationStats.pendingCount,
            totalRevenue: json.data.reservationStats.totalRevenue,
            occupancyRate: json.data.roomOccupancyStats.occupancyRate,
          });
        }
      } catch {
        // keep null
      }
    })();
  }, []);

  const cards = [
    { title: t('stats.pendingBookings'), value: stats ? stats.totalBookings.toLocaleString() : '-', icon: '▣', color: 'bg-stone-900 text-lime-400' },
    { title: t('stats.occupancyRate'), value: stats ? `${stats.occupancyRate.toFixed(1)}%` : '-', icon: '▤', color: 'bg-stone-900 text-lime-400' },
    { title: t('stats.revenue'), value: stats ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.totalRevenue) : '-', icon: '◉', color: 'bg-stone-900 text-lime-400' },
    { title: t('stats.pendingBookings'), value: stats ? String(stats.pendingCount) : '-', icon: '◎', color: 'bg-stone-900 text-lime-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center text-lg`}>
              {card.icon}
            </div>
          </div>
          <p className="text-3xl font-black text-stone-900 dark:text-stone-100">{card.value}</p>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mt-1">{card.title}</p>
        </div>
      ))}
    </div>
  );
}
