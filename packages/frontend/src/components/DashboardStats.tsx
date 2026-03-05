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

interface Card {
  title: string;
  value: string;
  sub?: string;
  iconPath: string;
  accentColor: string;
}

function StatIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  bookings:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  occupancy:  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
  revenue:    'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  pending:    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  confirmed:  'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  avgStay:    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  rooms:      'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3v12M8 9h8',
  available:  'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
};

const ACCENTS: Record<string, { color: string; bg: string }> = {
  gold:   { color: '#C9A96E', bg: 'rgba(201,169,110,0.08)' },
  sky:    { color: '#60B8D4', bg: 'rgba(96,184,212,0.08)' },
  green:  { color: '#4ADE80', bg: 'rgba(74,222,128,0.08)' },
  amber:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)' },
  violet: { color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
  rose:   { color: '#FB7185', bg: 'rgba(251,113,133,0.08)' },
};

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
            totalCount:      json.data.reservationStats.totalCount,
            pendingCount:    json.data.reservationStats.pendingCount,
            confirmedCount:  json.data.reservationStats.confirmedCount,
            totalRevenue:    json.data.reservationStats.totalRevenue,
            averageStayDays: json.data.reservationStats.averageStayDays,
            occupancyRate:   json.data.roomOccupancyStats.occupancyRate,
            totalRooms:      json.data.roomOccupancyStats.totalRooms,
            availableRooms:  json.data.roomOccupancyStats.availableRooms,
          });
        }
      } catch {
        // keep null
      }
    })();
  }, []);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const cards: (Card & { accentKey: string })[] = [
    { title: t('stats.totalBookings'),     value: stats ? stats.totalCount.toLocaleString() : '—',          iconPath: ICONS.bookings,  accentColor: ACCENTS.gold.color,   accentKey: 'gold' },
    { title: t('stats.occupancyRate'),     value: stats ? `${stats.occupancyRate.toFixed(1)}%` : '—',       iconPath: ICONS.occupancy, accentColor: ACCENTS.sky.color,    accentKey: 'sky' },
    { title: t('stats.revenue'),           value: stats ? fmtCurrency(stats.totalRevenue) : '—',            iconPath: ICONS.revenue,   accentColor: ACCENTS.green.color,  accentKey: 'green' },
    { title: t('stats.pendingBookings'),   value: stats ? String(stats.pendingCount) : '—',                 iconPath: ICONS.pending,   accentColor: ACCENTS.amber.color,  accentKey: 'amber' },
    { title: t('stats.confirmedBookings'), value: stats ? String(stats.confirmedCount) : '—',               iconPath: ICONS.confirmed, accentColor: ACCENTS.gold.color,   accentKey: 'gold' },
    { title: t('stats.avgStay'),           value: stats ? `${stats.averageStayDays.toFixed(1)}d` : '—',    iconPath: ICONS.avgStay,   accentColor: ACCENTS.violet.color, accentKey: 'violet' },
    { title: t('stats.totalRooms'),        value: stats ? String(stats.totalRooms) : '—',                   iconPath: ICONS.rooms,     accentColor: ACCENTS.sky.color,    accentKey: 'sky' },
    { title: t('stats.availableRooms'),    value: stats ? String(stats.availableRooms) : '—',               iconPath: ICONS.available, accentColor: ACCENTS.green.color,  accentKey: 'green' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const accent = ACCENTS[card.accentKey];
        return (
          <div
            key={i}
            className="rounded-xl p-5 transition-all duration-150 group"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
              (e.currentTarget as HTMLElement).style.borderColor = accent.color + '30';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
            }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
              style={{ background: accent.bg }}
            >
              <StatIcon d={card.iconPath} color={accent.color} />
            </div>

            {/* Value */}
            <p
              className="text-[1.75rem] font-bold leading-none mb-2 tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {card.value}
            </p>

            {/* Label */}
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] leading-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {card.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
