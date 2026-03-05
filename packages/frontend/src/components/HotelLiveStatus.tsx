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

interface Tile {
  label: string;
  value: string;
  sub: string;
  iconPath: string;
  alert: boolean;
}

const TILE_ICONS: Record<string, string> = {
  parking:  'M5 11a7 7 0 0114 0v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8zm4 0h2a2 2 0 012-2v0a2 2 0 01-2 2H9z',
  wellness: 'M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z',
  vouchers: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  guests:   'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z',
  rentals:  'M8 16l2.879-2.879m5.121-5.242L19 5M15 5h4v4M3 20l7.879-7.879',
  dirty:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
};

function TileIcon({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
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
            parkingOccupied:  d.parkingStats?.occupied ?? 0,
            parkingTotal:     d.parkingStats?.total ?? 0,
            wellnessScheduled: (d.wellnessBookings ?? []).filter((b: { status: string }) => b.status === 'SCHEDULED').length,
            activeVouchers:   (d.vouchers ?? []).length,
            guestProfiles:    (d.guests ?? []).length,
            activeRentals:    (d.rentalBookings ?? []).length,
            dirtyRooms:       (d.roomMaintenanceRecords ?? []).filter((r: { status: string }) => r.status === 'DIRTY').length,
          });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    })();
  }, []);

  const tiles: Tile[] | null = status
    ? [
        {
          label:    t('dashboard.parkingStatus'),
          value:    `${status.parkingOccupied}/${status.parkingTotal}`,
          sub:      `${status.parkingTotal - status.parkingOccupied} free`,
          iconPath: TILE_ICONS.parking,
          alert:    status.parkingOccupied === status.parkingTotal,
        },
        {
          label:    t('dashboard.wellnessToday'),
          value:    String(status.wellnessScheduled),
          sub:      'scheduled',
          iconPath: TILE_ICONS.wellness,
          alert:    false,
        },
        {
          label:    t('dashboard.activeVouchers'),
          value:    String(status.activeVouchers),
          sub:      'active',
          iconPath: TILE_ICONS.vouchers,
          alert:    false,
        },
        {
          label:    t('dashboard.guestProfiles'),
          value:    String(status.guestProfiles),
          sub:      'in database',
          iconPath: TILE_ICONS.guests,
          alert:    false,
        },
        {
          label:    t('dashboard.activeRentals'),
          value:    String(status.activeRentals),
          sub:      'checked out',
          iconPath: TILE_ICONS.rentals,
          alert:    status.activeRentals > 0,
        },
        {
          label:    t('dashboard.dirtyRooms'),
          value:    String(status.dirtyRooms),
          sub:      'need cleaning',
          iconPath: TILE_ICONS.dirty,
          alert:    status.dirtyRooms > 0,
        },
      ]
    : null;

  if (error) {
    return (
      <div
        className="rounded-xl p-4 text-[12px]"
        style={{ border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
      >
        Could not load live status.
      </div>
    );
  }

  const placeholders = Array(6).fill(null);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--card-border)' }}
    >
      {(tiles ?? placeholders).map((tile: Tile | null, i) => (
        <div
          key={i}
          className="flex items-center justify-between transition-colors"
          style={{
            padding: '11px 14px',
            borderBottom: i < 5 ? '1px solid var(--card-border)' : 'none',
            background: tile?.alert ? 'rgba(251,191,36,0.04)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!tile?.alert) (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = tile?.alert ? 'rgba(251,191,36,0.04)' : 'transparent';
          }}
        >
          {/* Left: icon + label */}
          <div className="flex items-center gap-2.5">
            <span style={{ color: tile?.alert ? '#FBBF24' : 'var(--text-muted)' }}>
              {tile ? <TileIcon d={tile.iconPath} /> : <span style={{ width: 14, height: 14, display: 'block' }} />}
            </span>
            <div>
              <p className="text-[12px] font-medium leading-none" style={{ color: 'var(--text-secondary)' }}>
                {tile?.label ?? <span className="inline-block w-24 h-3 rounded" style={{ background: 'var(--surface-hover)' }} />}
              </p>
              {tile?.sub && (
                <p className="text-[10px] mt-[2px] leading-none" style={{ color: 'var(--text-muted)' }}>
                  {tile.sub}
                </p>
              )}
            </div>
          </div>

          {/* Right: value */}
          <div className="flex items-center gap-2">
            {tile?.alert && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
            <span
              className="text-[15px] font-semibold tabular-nums"
              style={{
                color: tile?.alert ? '#FBBF24' : 'var(--text-primary)',
              }}
            >
              {tile?.value ?? '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
