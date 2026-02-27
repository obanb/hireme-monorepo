'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import type { TranslationKey } from '../locales';

interface MenuItem {
  nameKey: TranslationKey;
  href: string;
  icon: string;
  roles?: string[]; // if set, only these roles can see the item
}

const menuItems: MenuItem[] = [
  { nameKey: 'nav.dashboard', href: '/hotel-cms', icon: '◈' },
  { nameKey: 'nav.reception', href: '/hotel-cms/reception', icon: '◎', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.calendar', href: '/hotel-cms/calendar', icon: '◫' },
  { nameKey: 'nav.bookings', href: '/hotel-cms/bookings', icon: '▣' },
  { nameKey: 'nav.accounts', href: '/hotel-cms/accounts', icon: '◈', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.wellness', href: '/hotel-cms/wellness', icon: '✦', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.vouchers', href: '/hotel-cms/vouchers', icon: '◆', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.rooms', href: '/hotel-cms/rooms', icon: '▤', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.roomTypes', href: '/hotel-cms/room-types', icon: '◧', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.rateCodes', href: '/hotel-cms/rate-codes', icon: '◉', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.campaigns', href: '/hotel-cms/campaigns', icon: '✉', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.statistics', href: '/hotel-cms/statistics', icon: '◑' },
  { nameKey: 'nav.reports', href: '/hotel-cms/reports', icon: '▦', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.guests', href: '/hotel-cms/guests', icon: '◐', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.tiers', href: '/hotel-cms/tiers', icon: '★', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.parking', href: '/hotel-cms/parking', icon: '⬛', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.maintenance', href: '/hotel-cms/maintenance', icon: '◻', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.rentals', href: '/hotel-cms/rentals', icon: '◳', roles: ['ADMIN', 'USER'] },
  { nameKey: 'nav.users', href: '/hotel-cms/users', icon: '◑', roles: ['ADMIN'] },
  { nameKey: 'nav.settings', href: '/hotel-cms/settings', icon: '⚙' },
];

export default function HotelSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const visibleItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  });

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div
      className={`bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-72'
      } h-screen fixed left-0 top-0 flex flex-col shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50`}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-lime-400 via-emerald-500 to-teal-500" />

      {/* Logo/Header */}
      <div className="p-6 border-b border-stone-100 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 dark:bg-stone-700 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-lime-400 font-black text-xl">H</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-stone-900 dark:text-stone-100 font-black text-xl tracking-tight">HIREME</h1>
                <p className="text-stone-400 text-xs tracking-widest uppercase">{t('nav.hotelCms')}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            aria-label="Toggle sidebar"
          >
            <span className="text-lg font-bold">{isCollapsed ? '→' : '←'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-stone-900 dark:bg-stone-600 text-white shadow-lg shadow-stone-900/25 dark:shadow-stone-700/25'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              <span
                className={`text-lg flex-shrink-0 ${
                  isActive ? 'text-lime-400' : 'text-stone-400 group-hover:text-lime-500'
                }`}
              >
                {item.icon}
              </span>
              {!isCollapsed && <span className="font-medium">{t(item.nameKey)}</span>}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-2 h-2 rounded-full bg-lime-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme & Language Toggles */}
      <div className="px-4 py-3 border-t border-stone-100 dark:border-stone-700">
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-3 justify-between'}`}>
          {/* Language Toggle */}
          <div className="flex bg-stone-100 dark:bg-stone-700 rounded-lg p-0.5">
            <button
              onClick={() => setLocale('en')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                locale === 'en'
                  ? 'bg-white dark:bg-stone-500 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale('cs')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                locale === 'cs'
                  ? 'bg-white dark:bg-stone-500 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              CS
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-stone-100 dark:border-stone-700">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-stone-900 dark:text-stone-100 font-semibold text-sm truncate">{user?.name ?? 'Loading...'}</p>
                <p className="text-stone-400 text-xs truncate">{user?.role ?? ''}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-lg transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs"
                title={t('nav.logout')}
              >
                ↪
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
