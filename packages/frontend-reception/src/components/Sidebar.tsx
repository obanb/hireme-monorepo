'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

const nav: NavGroup[] = [
  {
    section: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/reception',
        icon: <Icon d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3a3 3 0 100 0.001" />,
      },
    ],
  },
  {
    section: 'Operations',
    items: [
      {
        label: 'Reservation Checks',
        href: '/reception/reservation-checks',
        icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />,
      },
      {
        label: 'Arriving Guests',
        href: '/reception/arriving-guests',
        icon: <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      },
      {
        label: 'Registration Cards',
        href: '/reception/registration-cards',
        icon: <Icon d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />,
      },
    ],
  },
];

function HotelMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Building silhouette */}
      <rect x="4" y="10" width="20" height="16" rx="1" stroke="var(--accent)" strokeWidth="1.5" fill="var(--accent-light)" />
      {/* Roof peak */}
      <path d="M2 11L14 3l12 8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Door */}
      <rect x="11" y="19" width="6" height="7" rx="0.5" stroke="var(--accent)" strokeWidth="1.2" />
      {/* Windows row */}
      <rect x="6" y="13" width="3" height="3" rx="0.5" fill="var(--accent)" opacity="0.6" />
      <rect x="12.5" y="13" width="3" height="3" rx="0.5" fill="var(--accent)" opacity="0.6" />
      <rect x="19" y="13" width="3" height="3" rx="0.5" fill="var(--accent)" opacity="0.6" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isActive = (href: string) =>
    href === '/reception' ? pathname === href : pathname.startsWith(href);

  const timeStr = time
    ? time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HotelMark />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}>
              Reception
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Hotel Ops
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 0' }} />

      {/* Navigation */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {nav.map((group, gi) => (
          <div key={group.section} style={{ marginBottom: gi < nav.length - 1 ? 16 : 0 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.11em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              padding: '0 10px',
              marginBottom: 5,
            }}>
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 7,
                    color: active ? 'var(--accent)' : 'var(--fg-muted)',
                    background: active ? 'var(--accent-light)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.1s',
                    marginBottom: 1,
                    position: 'relative',
                    borderLeft: active ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--fg)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
                    }
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0, opacity: active ? 1 : 0.65 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer with live clock */}
      <div style={{
        padding: '12px 18px 16px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--fg)',
          letterSpacing: '0.04em',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', letterSpacing: '0.03em' }}>
          {time ? time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : ''}
        </div>
      </div>

    </aside>
  );
}
