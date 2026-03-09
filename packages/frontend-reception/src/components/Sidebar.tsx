'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
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
        icon: <Icon d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 3a3 3 0 100 0.001" />,
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
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/reception' ? pathname === href : pathname.startsWith(href);

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border-strong)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              Reception
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1, letterSpacing: '0.03em' }}>
              Hotel Operations
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '14px 10px', flex: 1 }}>
        {nav.map((group) => (
          <div key={group.section} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              padding: '0 10px',
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
                    gap: 9,
                    padding: '7px 10px',
                    borderRadius: 6,
                    color: active ? 'var(--accent)' : 'var(--fg-muted)',
                    background: active ? 'var(--accent-light)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    transition: 'all 0.12s',
                    marginBottom: 1,
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--fg)';
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--fg-subtle)',
        letterSpacing: '0.02em',
      }}>
        Reception v1.0
      </div>
    </aside>
  );
}
