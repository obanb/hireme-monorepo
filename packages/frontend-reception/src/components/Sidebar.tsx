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
      {
        label: 'Benefits',
        href: '/reception/benefits',
        icon: <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
      },
      {
        label: 'Action Planning',
        href: '/reception/actions',
        icon: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
      },
    ],
  },
];

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
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>

      {/* Logo */}
      <div style={{ padding: '16px 16px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: 'linear-gradient(135deg, #E8A045 0%, #b86e1f 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 13,
            color: '#FFFFFF',
            letterSpacing: '0.12em',
            lineHeight: 1,
          }}>
            PORTIER
          </div>
          <div style={{
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '0.10em',
            color: 'rgba(255,255,255,.35)',
            marginTop: 3,
            textTransform: 'uppercase',
          }}>
            Reception
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '0' }} />

      {/* Navigation */}
      <nav style={{ padding: '10px 8px', flex: 1 }}>
        {nav.map((group, gi) => (
          <div key={group.section} style={{ marginBottom: gi < nav.length - 1 ? 14 : 0 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.11em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.28)',
              padding: '0 8px',
              marginBottom: 4,
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
                    padding: '7px 8px',
                    borderRadius: 6,
                    color: active ? '#E8A045' : 'rgba(255,255,255,.55)',
                    background: active ? 'rgba(232,160,69,.12)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.1s',
                    marginBottom: 1,
                    borderLeft: active ? '2.5px solid #E8A045' : '2.5px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.85)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.55)';
                    }
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Receptionist widget */}
      <div style={{
        margin: '0 8px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.09)',
        padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #E8A045 0%, #c97d2a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.03em',
          }}>
            MP
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,.88)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Martin Petras
            </div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,.38)',
              marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Front Desk Manager
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 9,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,.07)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,.45)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            OREA Resort Santon Brno
          </span>
        </div>
      </div>

      {/* Footer with live clock */}
      <div style={{
        padding: '12px 16px 14px',
        borderTop: '1px solid rgba(255,255,255,.07)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          fontWeight: 500,
          color: 'rgba(255,255,255,.75)',
          letterSpacing: '0.04em',
          lineHeight: 1,
          marginBottom: 3,
        }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', letterSpacing: '0.03em' }}>
          {time ? time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : ''}
        </div>
      </div>

    </aside>
  );
}
