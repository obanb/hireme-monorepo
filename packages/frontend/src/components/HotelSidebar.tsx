'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/hotel-cms', icon: '📊' },
  { name: 'Calendar', href: '/hotel-cms/calendar', icon: '📅' },
  { name: 'Rooms', href: '/hotel-cms/rooms', icon: '🛏️' },
  { name: 'Bookings', href: '/hotel-cms/bookings', icon: '📋' },
  { name: 'Guests', href: '/hotel-cms/guests', icon: '👥' },
  { name: 'Settings', href: '/hotel-cms/settings', icon: '⚙️' },
];

export default function HotelSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 flex flex-col shadow-2xl`}>
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Hotel CMS
              </h1>
              <p className="text-sm text-slate-400 mt-1">Management System</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <span className="text-xl">{isCollapsed ? '→' : '←'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        {!isCollapsed && (
          <div className="text-sm text-slate-400">
            <p>Version 1.0.0</p>
            <p className="mt-1">© 2024 Hotel CMS</p>
          </div>
        )}
      </div>
    </div>
  );
}

