'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface Stats {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  totalRevenue: number;
  averageStayDays: number;
  occupancyRate: number;
  totalRooms: number;
  availableRooms: number;
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
              reservationStats { totalCount pendingCount confirmedCount totalRevenue averageStayDays }
              roomOccupancyStats { occupancyRate totalRooms availableRooms }
            }`,
          }),
        });
        const json = await res.json();
        if (json.data) {
          setStats({
            totalCount: json.data.reservationStats.totalCount,
            pendingCount: json.data.reservationStats.pendingCount,
            confirmedCount: json.data.reservationStats.confirmedCount,
            totalRevenue: json.data.reservationStats.totalRevenue,
            averageStayDays: json.data.reservationStats.averageStayDays,
            occupancyRate: json.data.roomOccupancyStats.occupancyRate,
            totalRooms: json.data.roomOccupancyStats.totalRooms,
            availableRooms: json.data.roomOccupancyStats.availableRooms,
          });
        }
      } catch {
        // keep null
      }
    })();
  }, []);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const cards = [
    { title: t('stats.totalBookings'),     value: stats ? stats.totalCount.toLocaleString() : '-',           icon: '▣', accent: 'text-lime-400' },
    { title: t('stats.occupancyRate'),     value: stats ? `${stats.occupancyRate.toFixed(1)}%` : '-',        icon: '▤', accent: 'text-sky-400' },
    { title: t('stats.revenue'),           value: stats ? fmtCurrency(stats.totalRevenue) : '-',             icon: '◉', accent: 'text-emerald-400' },
    { title: t('stats.pendingBookings'),   value: stats ? String(stats.pendingCount) : '-',                  icon: '◎', accent: 'text-amber-400' },
    { title: t('stats.confirmedBookings'), value: stats ? String(stats.confirmedCount) : '-',                icon: '◈', accent: 'text-lime-400' },
    { title: t('stats.avgStay'),           value: stats ? stats.averageStayDays.toFixed(1) : '-',            icon: '◷', accent: 'text-purple-400' },
    { title: t('stats.totalRooms'),        value: stats ? String(stats.totalRooms) : '-',                    icon: '▦', accent: 'text-sky-400' },
    { title: t('stats.availableRooms'),    value: stats ? String(stats.availableRooms) : '-',                icon: '▧', accent: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-lg ${card.accent}`}>
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
