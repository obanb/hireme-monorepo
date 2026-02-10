'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  roles?: string[]; // if set, only these roles can see the item
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/hotel-cms', icon: '◈' },
  { name: 'Reception', href: '/hotel-cms/reception', icon: '◎', roles: ['ADMIN', 'USER'] },
  { name: 'Calendar', href: '/hotel-cms/calendar', icon: '◫' },
  { name: 'Bookings', href: '/hotel-cms/bookings', icon: '▣' },
  { name: 'Wellness', href: '/hotel-cms/wellness', icon: '✦', roles: ['ADMIN', 'USER'] },
  { name: 'Vouchers', href: '/hotel-cms/vouchers', icon: '◆', roles: ['ADMIN', 'USER'] },
  { name: 'Rooms', href: '/hotel-cms/rooms', icon: '▤', roles: ['ADMIN', 'USER'] },
  { name: 'Room Types', href: '/hotel-cms/room-types', icon: '◧', roles: ['ADMIN', 'USER'] },
  { name: 'Rate Codes', href: '/hotel-cms/rate-codes', icon: '◉', roles: ['ADMIN', 'USER'] },
  { name: 'Campaigns', href: '/hotel-cms/campaigns', icon: '✉', roles: ['ADMIN', 'USER'] },
  { name: 'Statistics', href: '/hotel-cms/statistics', icon: '◑' },
  { name: 'Guests', href: '/hotel-cms/guests', icon: '◐', roles: ['ADMIN', 'USER'] },
  { name: 'Users', href: '/hotel-cms/users', icon: '◑', roles: ['ADMIN'] },
  { name: 'Settings', href: '/hotel-cms/settings', icon: '⚙' },
];

export default function HotelSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const visibleItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  });

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div
      className={`bg-white border-r border-stone-200 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-72'
      } h-screen fixed left-0 top-0 flex flex-col shadow-xl shadow-stone-200/50`}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-lime-400 via-emerald-500 to-teal-500" />

      {/* Logo/Header */}
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-lime-400 font-black text-xl">H</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-stone-900 font-black text-xl tracking-tight">HIREME</h1>
                <p className="text-stone-400 text-xs tracking-widest uppercase">Hotel CMS</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-400 hover:text-stone-600"
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
                  ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/25'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <span
                className={`text-lg flex-shrink-0 ${
                  isActive ? 'text-lime-400' : 'text-stone-400 group-hover:text-lime-500'
                }`}
              >
                {item.icon}
              </span>
              {!isCollapsed && <span className="font-medium">{item.name}</span>}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-2 h-2 rounded-full bg-lime-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-stone-100">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-stone-900 font-semibold text-sm truncate">{user?.name ?? 'Loading...'}</p>
                <p className="text-stone-400 text-xs truncate">{user?.role ?? ''}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-400 hover:text-stone-600 text-xs"
                title="Logout"
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
