'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface LiveStatus {
  parkingOccupied: number;
  parkingTotal: number;
  wellnessScheduled: number;
  activeVouchers: number;
  guestProfiles: number;
  activeRentals: number;
  dirtyRooms: number;
}

export default function HotelLiveStatus() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [error, setError] = useState(false);
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
              parkingStats { total occupied }
              wellnessBookings { id status }
              vouchers(includeInactive: false) { id }
              guests { id }
              rentalBookings(status: ACTIVE) { id }
              roomMaintenanceRecords { id status }
            }`,
          }),
        });
        const json = await res.json();
        if (json.data) {
          const d = json.data;
          setStatus({
            parkingOccupied: d.parkingStats?.occupied ?? 0,
            parkingTotal: d.parkingStats?.total ?? 0,
            wellnessScheduled: (d.wellnessBookings ?? []).filter((b: { status: string }) => b.status === 'SCHEDULED').length,
            activeVouchers: (d.vouchers ?? []).length,
            guestProfiles: (d.guests ?? []).length,
            activeRentals: (d.rentalBookings ?? []).length,
            dirtyRooms: (d.roomMaintenanceRecords ?? []).filter((r: { status: string }) => r.status === 'DIRTY').length,
          });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    })();
  }, []);

  const tiles = status
    ? [
        {
          label: t('dashboard.parkingStatus'),
          value: `${status.parkingOccupied}/${status.parkingTotal}`,
          sub: `${status.parkingTotal - status.parkingOccupied} free`,
          icon: '🅿',
          alert: status.parkingOccupied === status.parkingTotal,
        },
        {
          label: t('dashboard.wellnessToday'),
          value: String(status.wellnessScheduled),
          sub: 'scheduled',
          icon: '♨',
          alert: false,
        },
        {
          label: t('dashboard.activeVouchers'),
          value: String(status.activeVouchers),
          sub: 'valid',
          icon: '◈',
          alert: false,
        },
        {
          label: t('dashboard.guestProfiles'),
          value: String(status.guestProfiles),
          sub: 'in database',
          icon: '◉',
          alert: false,
        },
        {
          label: t('dashboard.activeRentals'),
          value: String(status.activeRentals),
          sub: 'checked out',
          icon: '▣',
          alert: status.activeRentals > 0,
        },
        {
          label: t('dashboard.dirtyRooms'),
          value: String(status.dirtyRooms),
          sub: 'need cleaning',
          icon: '▤',
          alert: status.dirtyRooms > 0,
        },
      ]
    : null;

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 text-stone-400 text-sm">
        Could not load live status.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {(tiles ?? Array(6).fill(null)).map((tile, i) => (
        <div
          key={i}
          className={`bg-white dark:bg-stone-800 rounded-2xl border-2 p-5 flex flex-col gap-2 ${
            tile?.alert
              ? 'border-amber-300 dark:border-amber-600'
              : 'border-stone-200 dark:border-stone-700'
          }`}
        >
          <div className="text-2xl">{tile?.icon ?? '·'}</div>
          <p className="text-3xl font-black text-stone-900 dark:text-stone-100">
            {tile?.value ?? '-'}
          </p>
          <div>
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              {tile?.label ?? ''}
            </p>
            <p className="text-xs text-stone-400">{tile?.sub ?? ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
