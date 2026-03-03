'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import type { TranslationKey } from '../locales';

/* ─── types ─────────────────────────────────────────────────────────────── */
interface NavItem {
  nameKey: TranslationKey;
  href: string;
  icon: string;
  roles?: string[];
}
interface NavSection {
  label: string;
  items: NavItem[];
}

/* ─── SVG icon paths (24×24 viewBox, stroke-based) ──────────────────────── */
const I: Record<string, string> = {
  dashboard:   'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  reception:   'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z',
  calendar:    'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  bookings:    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h4',
  accounts:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  wellness:    'M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z',
  vouchers:    'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  rooms:       'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm6 11V10h6v10H9z',
  roomTypes:   'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3v12M8 9h8M8 15h5',
  rateCodes:   'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  campaigns:   'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  statistics:  'M18 20V10m-6 10V4M6 20v-6',
  reports:     'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6m-4 5H8m4 4H8',
  guests:      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm8 14v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  tiers:       'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  parking:     'M5 11a7 7 0 0114 0v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8zm4 0h2a2 2 0 012-2v0a2 2 0 01-2 2H9z',
  maintenance: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM12 15a3 3 0 100-6 3 3 0 000 6z',
  rentals:     'M8 16l2.879-2.879m5.121-5.242L19 5M15 5h4v4M3 20l7.879-7.879M11 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4',
  users:       'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  settings:    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM12 15a3 3 0 100-6 3 3 0 000 6z',
};

const sections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { nameKey: 'nav.dashboard', href: '/hotel-cms',           icon: I.dashboard },
      { nameKey: 'nav.reception', href: '/hotel-cms/reception', icon: I.reception, roles: ['ADMIN', 'USER'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { nameKey: 'nav.calendar',  href: '/hotel-cms/calendar',  icon: I.calendar },
      { nameKey: 'nav.bookings',  href: '/hotel-cms/bookings',  icon: I.bookings },
      { nameKey: 'nav.accounts',  href: '/hotel-cms/accounts',  icon: I.accounts,  roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.wellness',  href: '/hotel-cms/wellness',  icon: I.wellness,  roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.vouchers',  href: '/hotel-cms/vouchers',  icon: I.vouchers,  roles: ['ADMIN', 'USER'] },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { nameKey: 'nav.rooms',     href: '/hotel-cms/rooms',      icon: I.rooms,     roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.roomTypes', href: '/hotel-cms/room-types', icon: I.roomTypes, roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.rateCodes', href: '/hotel-cms/rate-codes', icon: I.rateCodes, roles: ['ADMIN', 'USER'] },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { nameKey: 'nav.campaigns',  href: '/hotel-cms/campaigns',  icon: I.campaigns,  roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.statistics', href: '/hotel-cms/statistics', icon: I.statistics },
      { nameKey: 'nav.reports',    href: '/hotel-cms/reports',    icon: I.reports,    roles: ['ADMIN', 'USER'] },
    ],
  },
  {
    label: 'Guests',
    items: [
      { nameKey: 'nav.guests', href: '/hotel-cms/guests', icon: I.guests, roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.tiers',  href: '/hotel-cms/tiers',  icon: I.tiers,  roles: ['ADMIN', 'USER'] },
    ],
  },
  {
    label: 'Facility',
    items: [
      { nameKey: 'nav.parking',     href: '/hotel-cms/parking',     icon: I.parking,     roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.maintenance', href: '/hotel-cms/maintenance',  icon: I.maintenance, roles: ['ADMIN', 'USER'] },
      { nameKey: 'nav.rentals',     href: '/hotel-cms/rentals',      icon: I.rentals,     roles: ['ADMIN', 'USER'] },
    ],
  },
  {
    label: 'System',
    items: [
      { nameKey: 'nav.users',    href: '/hotel-cms/users',    icon: I.users,    roles: ['ADMIN'] },
      { nameKey: 'nav.settings', href: '/hotel-cms/settings', icon: I.settings },
    ],
  },
];

function NavIcon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

export default function HotelSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '64px' : '280px',
    );
  }, [isCollapsed]);

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const filterItems = (items: NavItem[]) =>
    items.filter((item) =>
      !item.roles ? true : user ? item.roles.includes(user.role) : false,
    );

  const visibleSections = sections
    .map((s) => ({ ...s, items: filterItems(s.items) }))
    .filter((s) => s.items.length > 0);

  return (
    <aside
      style={{
        width: isCollapsed ? '64px' : '280px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
      className="h-screen fixed left-0 top-0 flex flex-col z-50 overflow-hidden"
    >
      {/* Thin gold accent line on the left edge */}
      <div
        className="absolute left-0 top-[10%] bottom-[10%] w-px pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--gold-light), transparent)', opacity: 0.4 }}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center h-[58px] border-b"
        style={{
          borderColor: 'var(--sidebar-border)',
          padding: isCollapsed ? '0 14px' : '0 16px',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex-shrink-0 w-[30px] h-[30px] rounded-[6px] flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, var(--gold-light), var(--gold))' }}
          >
            <span
              className="text-[#0D0E14] text-[13px] font-bold leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              M
            </span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div
                className="text-[13px] font-semibold leading-none tracking-tight truncate"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                Manatee
              </div>
              <div
                className="text-[8.5px] tracking-[0.2em] uppercase font-semibold mt-[3px]"
                style={{ color: 'var(--gold)' }}
              >
                Hotel CMS
              </div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            aria-label="Collapse sidebar"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Expand button floating on edge when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-[20px] w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10 transition-colors"
          style={{
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--sidebar-border)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          aria-label="Expand sidebar"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: isCollapsed ? '12px 10px' : '12px 10px' }}>
        {visibleSections.map((section, si) => (
          <div key={section.label} style={{ marginBottom: si < visibleSections.length - 1 ? '16px' : 0 }}>
            {!isCollapsed ? (
              <div style={{ padding: '0 6px', marginBottom: '4px' }}>
                <span
                  className="text-[9px] font-semibold tracking-[0.2em] uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {section.label}
                </span>
              </div>
            ) : (
              si > 0 && (
                <div className="flex justify-center mb-2">
                  <div className="w-4 h-px" style={{ background: 'var(--card-border)' }} />
                </div>
              )
            )}

            <ul className="space-y-px">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={isCollapsed ? t(item.nameKey) : undefined}
                      className="relative flex items-center rounded-[6px] transition-all duration-150"
                      style={{
                        gap: '9px',
                        padding: isCollapsed ? '8px 9px' : '6px 9px',
                        justifyContent: isCollapsed ? 'center' : undefined,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--surface-hover)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-sm"
                          style={{ background: 'var(--gold)' }}
                        />
                      )}

                      <span style={{ color: isActive ? 'var(--gold)' : 'inherit', opacity: isActive ? 1 : 0.7 }}>
                        <NavIcon d={item.icon} />
                      </span>

                      {!isCollapsed && (
                        <span
                          className="text-[12.5px] font-medium flex-1 leading-none"
                          style={{ letterSpacing: '-0.01em' }}
                        >
                          {t(item.nameKey)}
                        </span>
                      )}

                      {isActive && !isCollapsed && (
                        <span
                          className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                          style={{ background: 'var(--gold)', opacity: 0.5 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        {/* Controls */}
        <div
          className="flex items-center"
          style={{
            padding: '10px 14px',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            flexDirection: isCollapsed ? 'column' : 'row',
            gap: isCollapsed ? '6px' : 0,
          }}
        >
          <div
            className="flex rounded-md overflow-hidden"
            style={{ background: 'var(--surface-hover)', padding: '2px', gap: '1px' }}
          >
            {(['en', 'cs'] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => setLocale(lng)}
                className="px-[7px] py-[3px] text-[9px] font-semibold uppercase tracking-wider rounded transition-all"
                style={{
                  background: locale === lng ? 'var(--sidebar-bg)' : 'transparent',
                  color: locale === lng ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: locale === lng ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {lng}
              </button>
            ))}
          </div>

          <button
            onClick={toggleTheme}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-7.5-1.5 1.5M7 7 5.5 5.5M5.5 18.5 7 17m10 1.5-1.5-1.5" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* User */}
        <div style={{ padding: '0 10px 12px' }}>
          <div
            className="flex items-center rounded-lg transition-colors"
            style={{
              gap: isCollapsed ? 0 : '9px',
              padding: '7px 8px',
              justifyContent: isCollapsed ? 'center' : undefined,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #A855F7)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em' }}
            >
              {initials}
            </div>

            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12.5px] font-medium leading-none mb-[3px] truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user?.name ?? '—'}
                  </p>
                  <p
                    className="text-[9px] uppercase tracking-[0.14em] leading-none truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {user?.role ?? ''}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#EF4444')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                  title={t('nav.logout')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14 5-5-5-5m5 5H9" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
