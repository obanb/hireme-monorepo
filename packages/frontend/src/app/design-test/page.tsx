'use client';

import { useState } from 'react';

// Fresh, bold design - Dark theme with lime accents
export default function DesignTestPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarHovered, setSidebarHovered] = useState<string | null>(null);

  const stats = [
    { label: 'Total Revenue', value: '$284,392', change: '+23.5%', up: true },
    { label: 'Bookings', value: '1,847', change: '+18.2%', up: true },
    { label: 'Occupancy', value: '94.2%', change: '+5.1%', up: true },
    { label: 'Avg. Rating', value: '4.92', change: '+0.3', up: true },
  ];

  const recentBookings = [
    { id: 'BK-2847', guest: 'Alexander Chen', room: 'Presidential Suite', checkIn: 'Feb 8', nights: 4, amount: '$4,200', status: 'confirmed' },
    { id: 'BK-2846', guest: 'Maria Santos', room: 'Ocean View Deluxe', checkIn: 'Feb 7', nights: 3, amount: '$1,890', status: 'checked-in' },
    { id: 'BK-2845', guest: 'James Wilson', room: 'Garden Villa', checkIn: 'Feb 7', nights: 5, amount: '$3,750', status: 'confirmed' },
    { id: 'BK-2844', guest: 'Sophie Laurent', room: 'Penthouse', checkIn: 'Feb 6', nights: 2, amount: '$2,400', status: 'checked-out' },
  ];

  const menuItems = [
    { id: 'overview', icon: '◈', label: 'Overview' },
    { id: 'bookings', icon: '◎', label: 'Bookings' },
    { id: 'rooms', icon: '▣', label: 'Rooms' },
    { id: 'guests', icon: '◉', label: 'Guests' },
    { id: 'wellness', icon: '✦', label: 'Wellness' },
    { id: 'vouchers', icon: '◆', label: 'Vouchers' },
    { id: 'analytics', icon: '◐', label: 'Analytics' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="w-72 bg-black border-r border-white/5 flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-lime-500/25">
                <span className="text-black font-black text-xl">H</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-lime-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">HIREME</h1>
              <p className="text-white/40 text-xs tracking-widest uppercase">Hotel CMS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setSidebarHovered(item.id)}
              onMouseLeave={() => setSidebarHovered(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                activeTab === item.id
                  ? 'bg-lime-400 text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {/* Hover glow effect */}
              {sidebarHovered === item.id && activeTab !== item.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-lime-400/10 to-transparent" />
              )}
              <span className={`text-lg relative z-10 ${activeTab === item.id ? 'text-black' : 'text-lime-400'}`}>
                {item.icon}
              </span>
              <span className="font-medium relative z-10">{item.label}</span>
              {activeTab === item.id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-black" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">John Doe</p>
              <p className="text-white/40 text-xs truncate">Admin</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-lime-400" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Good evening, <span className="text-lime-400">John</span>
              </h2>
              <p className="text-white/40 mt-1">Here&apos;s what&apos;s happening at your property today</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 px-4 py-2.5 pl-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-lime-400/50 focus:bg-white/10 transition-all"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Notifications */}
              <button className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-lime-400 rounded-full border-2 border-black" />
              </button>
              {/* Quick Action */}
              <button className="px-5 py-2.5 rounded-xl bg-lime-400 text-black font-semibold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/25 hover:shadow-lime-400/40 hover:scale-105 active:scale-100">
                + New Booking
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="group relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-lime-400/30 transition-all duration-500 overflow-hidden"
              >
                {/* Decorative gradient */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  i === 0 ? 'bg-lime-400/20' : i === 1 ? 'bg-cyan-400/20' : i === 2 ? 'bg-violet-400/20' : 'bg-amber-400/20'
                }`} />

                <div className="relative">
                  <p className="text-white/50 text-sm font-medium mb-2">{stat.label}</p>
                  <p className="text-4xl font-bold text-white mb-3 tracking-tight">{stat.value}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                    stat.up ? 'bg-lime-400/10 text-lime-400' : 'bg-red-400/10 text-red-400'
                  }`}>
                    <span>{stat.up ? '↑' : '↓'}</span>
                    <span>{stat.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-3 gap-6">
            {/* Recent Bookings - Takes 2 columns */}
            <div className="col-span-2 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Recent Bookings</h3>
                  <p className="text-white/40 text-sm">Latest reservations at your property</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">
                  View All →
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="p-5 hover:bg-white/[0.02] transition-colors flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400/20 to-emerald-400/20 border border-lime-400/20 flex items-center justify-center">
                      <span className="text-lime-400 font-bold text-sm">{booking.guest.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-white font-medium">{booking.guest}</p>
                        <span className="text-white/30 text-xs font-mono">{booking.id}</span>
                      </div>
                      <p className="text-white/40 text-sm">{booking.room} · {booking.nights} nights</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{booking.amount}</p>
                      <p className="text-white/40 text-sm">{booking.checkIn}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20' :
                      booking.status === 'checked-in' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' :
                      'bg-white/10 text-white/60 border border-white/10'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-6">
              {/* Occupancy Chart */}
              <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Room Occupancy</h3>
                <div className="relative h-40 flex items-end justify-between gap-2">
                  {[65, 78, 92, 88, 94, 97, 91].map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-lime-400 to-emerald-400 transition-all duration-500 hover:from-lime-300 hover:to-emerald-300"
                        style={{ height: `${value}%` }}
                      />
                      <span className="text-white/30 text-xs">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl bg-gradient-to-br from-lime-400/10 to-emerald-400/5 border border-lime-400/20 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {[
                    { icon: '◎', label: 'Check-in Guest', desc: '3 arrivals today' },
                    { icon: '▣', label: 'Room Service', desc: '2 pending requests' },
                    { icon: '✦', label: 'Spa Booking', desc: '5 slots available' },
                  ].map((action) => (
                    <button key={action.label} className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/30 hover:bg-black/50 border border-white/5 hover:border-lime-400/30 transition-all group">
                      <span className="text-lime-400 text-lg">{action.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{action.label}</p>
                        <p className="text-white/40 text-xs">{action.desc}</p>
                      </div>
                      <span className="text-white/20 group-hover:text-lime-400 transition-colors">→</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Activity */}
              <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <h3 className="text-lg font-bold text-white">Live Activity</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { time: '2m ago', text: 'New booking from website', type: 'booking' },
                    { time: '15m ago', text: 'Room 405 checked out', type: 'checkout' },
                    { time: '32m ago', text: 'Spa appointment completed', type: 'wellness' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'booking' ? 'bg-lime-400' :
                        activity.type === 'checkout' ? 'bg-cyan-400' : 'bg-violet-400'
                      }`} />
                      <div>
                        <p className="text-white/80 text-sm">{activity.text}</p>
                        <p className="text-white/30 text-xs">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
