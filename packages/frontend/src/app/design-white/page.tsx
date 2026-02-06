'use client';

import { useState, useMemo } from 'react';

// Room types with colors
const roomTypes = [
  { id: 'single', name: 'Single', color: '#84cc16' },
  { id: 'double', name: 'Double', color: '#06b6d4' },
  { id: 'suite', name: 'Suite', color: '#8b5cf6' },
  { id: 'deluxe', name: 'Deluxe', color: '#f59e0b' },
  { id: 'penthouse', name: 'Penthouse', color: '#ef4444' },
];

// Generate mock bookings
const generateMockBookings = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    { id: '1', roomType: 'single', guestName: 'John Doe', checkIn: new Date(today.getTime() + 2 * 86400000), checkOut: new Date(today.getTime() + 5 * 86400000), status: 'confirmed' },
    { id: '2', roomType: 'double', guestName: 'Jane Smith', checkIn: new Date(today.getTime() + 3 * 86400000), checkOut: new Date(today.getTime() + 7 * 86400000), status: 'confirmed' },
    { id: '3', roomType: 'suite', guestName: 'Bob Johnson', checkIn: new Date(today.getTime() + 5 * 86400000), checkOut: new Date(today.getTime() + 9 * 86400000), status: 'pending' },
    { id: '4', roomType: 'deluxe', guestName: 'Alice Williams', checkIn: new Date(today.getTime() + 1 * 86400000), checkOut: new Date(today.getTime() + 4 * 86400000), status: 'confirmed' },
    { id: '5', roomType: 'penthouse', guestName: 'Michael Brown', checkIn: new Date(today.getTime() - 2 * 86400000), checkOut: new Date(today.getTime() + 1 * 86400000), status: 'confirmed' },
    { id: '6', roomType: 'single', guestName: 'Sarah Davis', checkIn: new Date(today.getTime() + 8 * 86400000), checkOut: new Date(today.getTime() + 11 * 86400000), status: 'pending' },
    { id: '7', roomType: 'suite', guestName: 'Tom Wilson', checkIn: new Date(today.getTime() - 1 * 86400000), checkOut: new Date(today.getTime() + 3 * 86400000), status: 'confirmed' },
  ];
};

export default function DesignWhitePage() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>(roomTypes.map(rt => rt.id));
  const [mockBookings] = useState(generateMockBookings);

  const menuItems = [
    { id: 'overview', icon: '◈', label: 'Overview' },
    { id: 'calendar', icon: '◫', label: 'Calendar' },
    { id: 'bookings', icon: '◎', label: 'Bookings' },
    { id: 'rooms', icon: '▣', label: 'Rooms' },
    { id: 'guests', icon: '◉', label: 'Guests' },
    { id: 'wellness', icon: '✦', label: 'Wellness' },
    { id: 'vouchers', icon: '◆', label: 'Vouchers' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ];

  // Calendar logic
  const startOfWeek = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }, [currentDate]);

  const daysInView = useMemo(() => {
    if (viewMode === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
      });
    } else {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startDay = firstDay.getDay();
      const adjustedStart = startDay === 0 ? 6 : startDay - 1;
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const totalDays = Math.ceil((adjustedStart + lastDay.getDate()) / 7) * 7;
      return Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(firstDay);
        date.setDate(date.getDate() + i - adjustedStart);
        return date;
      });
    }
  }, [currentDate, startOfWeek, viewMode]);

  const filteredBookings = useMemo(() => {
    return mockBookings.filter(b => selectedRoomTypes.includes(b.roomType));
  }, [selectedRoomTypes, mockBookings]);

  const getBookingsForDate = (date: Date) => {
    return filteredBookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d >= checkIn && d < checkOut;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const toggleRoomType = (id: string) => {
    setSelectedRoomTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const formatDateRange = () => {
    if (viewMode === 'week') {
      const start = daysInView[0];
      const end = daysInView[6];
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-stone-200 flex flex-col fixed h-full shadow-xl shadow-stone-200/50">
        <div className="p-6 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-lime-400 via-emerald-500 to-teal-500" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center shadow-lg">
              <span className="text-lime-400 font-black text-xl">H</span>
            </div>
            <div>
              <h1 className="text-stone-900 font-black text-xl tracking-tight">HIREME</h1>
              <p className="text-stone-400 text-xs tracking-widest uppercase">Hotel CMS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/25'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <span className={`text-lg ${activeTab === item.id ? 'text-lime-400' : 'text-stone-400 group-hover:text-lime-500'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && <div className="ml-auto w-2 h-2 rounded-full bg-lime-400" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="text-white font-bold text-sm">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-stone-900 font-semibold text-sm truncate">John Doe</p>
              <p className="text-stone-400 text-xs truncate">Admin</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-lime-400 shadow-lg shadow-lime-400/50" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-stone-100/80 backdrop-blur-xl">
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <p className="text-stone-400 text-sm font-medium mb-1">Room Management</p>
              <h2 className="text-4xl font-black text-stone-900 tracking-tight">Calendar</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search bookings..."
                  className="w-64 px-4 py-3 pl-11 rounded-2xl bg-white border-2 border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-400/10 transition-all shadow-sm"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button className="px-6 py-3 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/25 flex items-center gap-2">
                <span className="text-lime-400">+</span>
                New Booking
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 pt-4">
          {/* Calendar Controls */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-sm mb-6 overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateDate('prev')}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors text-stone-600 font-bold"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 rounded-xl bg-lime-400 text-stone-900 font-bold hover:bg-lime-300 transition-colors shadow-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateDate('next')}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors text-stone-600 font-bold"
                >
                  →
                </button>
                <h3 className="text-xl font-black text-stone-900 ml-4">{formatDateRange()}</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-stone-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      viewMode === 'week' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      viewMode === 'month' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Month
                  </button>
                </div>
              </div>
            </div>

            {/* Room Type Filters */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-stone-500">Filter:</span>
              {roomTypes.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => toggleRoomType(rt.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    selectedRoomTypes.includes(rt.id)
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rt.color }} />
                  <span className="text-sm font-medium">{rt.name}</span>
                </button>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="p-5">
              {/* Day Headers */}
              <div className={`grid gap-2 mb-3 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center py-2 text-sm font-bold text-stone-400 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Body */}
              <div className={`grid gap-2 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
                {daysInView.map((date, idx) => {
                  const bookings = getBookingsForDate(date);
                  const today = isToday(date);
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-3 transition-all cursor-pointer hover:shadow-lg group ${
                        viewMode === 'week' ? 'min-h-[180px]' : 'min-h-[120px]'
                      } ${
                        today
                          ? 'bg-lime-400 shadow-lg shadow-lime-400/25'
                          : isCurrentMonth
                          ? 'bg-stone-50 hover:bg-white border-2 border-stone-100 hover:border-lime-400/30'
                          : 'bg-stone-50/50 border-2 border-stone-100/50 opacity-60'
                      }`}
                    >
                      <div className={`text-lg font-black mb-2 ${
                        today ? 'text-stone-900' : isCurrentMonth ? 'text-stone-700' : 'text-stone-400'
                      }`}>
                        {date.getDate()}
                        {today && <span className="text-xs font-bold ml-2 text-stone-700/70">TODAY</span>}
                      </div>

                      <div className="space-y-1.5">
                        {bookings.slice(0, viewMode === 'week' ? 4 : 2).map((booking) => {
                          const roomType = roomTypes.find(rt => rt.id === booking.roomType);
                          return (
                            <div
                              key={booking.id}
                              className={`p-2 rounded-xl text-white transition-all hover:scale-105 cursor-pointer ${
                                booking.status === 'pending' ? 'opacity-70' : ''
                              }`}
                              style={{ backgroundColor: roomType?.color }}
                            >
                              <div className="text-xs font-bold truncate">{booking.guestName}</div>
                              <div className="text-xs opacity-80 truncate">{roomType?.name}</div>
                            </div>
                          );
                        })}
                        {bookings.length > (viewMode === 'week' ? 4 : 2) && (
                          <div className="text-xs font-bold text-stone-400 text-center">
                            +{bookings.length - (viewMode === 'week' ? 4 : 2)} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Cards */}
          <div className="grid grid-cols-3 gap-6">
            {/* Upcoming Check-ins */}
            <div className="rounded-3xl bg-white border-2 border-stone-200 p-6 shadow-sm">
              <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
                <span className="text-lime-500">◎</span> Upcoming Check-ins
              </h3>
              <div className="space-y-3">
                {mockBookings.filter(b => b.checkIn > new Date()).slice(0, 4).map((booking) => {
                  const roomType = roomTypes.find(rt => rt.id === booking.roomType);
                  return (
                    <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: roomType?.color }}>
                        {booking.guestName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-900 text-sm truncate">{booking.guestName}</p>
                        <p className="text-xs text-stone-500">{roomType?.name} · {booking.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        booking.status === 'confirmed' ? 'bg-lime-100 text-lime-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Occupancy Stats - Dark card */}
            <div className="rounded-3xl bg-stone-900 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">This Week&apos;s Occupancy</h3>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-t from-lime-400 to-emerald-400" />
                    <span className="text-stone-400">Occupancy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-amber-400 rounded" />
                    <span className="text-stone-400">Revenue</span>
                  </div>
                </div>
              </div>
              <div className="relative h-32 mb-4">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25].map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-600 w-6 text-right">{val}%</span>
                      <div className="flex-1 border-t border-stone-700/50 border-dashed" />
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="absolute inset-0 pl-8 flex items-end justify-between gap-2">
                  {[72, 85, 91, 88, 95, 98, 89].map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 relative group">
                      <div
                        className="w-full rounded-lg bg-gradient-to-t from-lime-400 to-emerald-400 transition-all duration-500 group-hover:from-lime-300 relative z-10"
                        style={{ height: `${value}%` }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-stone-900 text-xs font-bold px-2 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {value}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Line chart overlay */}
                <svg className="absolute inset-0 pl-8 overflow-visible pointer-events-none" preserveAspectRatio="none">
                  {(() => {
                    const values = [65, 78, 88, 82, 92, 95, 85]; // Revenue trend line (different from bars)
                    const points = values.map((v, i) => {
                      const x = (i / (values.length - 1)) * 100;
                      const y = 100 - v;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <>
                        {/* Line shadow */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke="rgba(251, 191, 36, 0.3)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          style={{ filter: 'blur(4px)' }}
                        />
                        {/* Main line */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Data points */}
                        {values.map((v, i) => {
                          const x = (i / (values.length - 1)) * 100;
                          const y = 100 - v;
                          return (
                            <circle
                              key={i}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="4"
                              fill="#fbbf24"
                              stroke="#1c1917"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Day labels */}
              <div className="pl-8 flex justify-between mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day} className="text-stone-500 text-xs font-medium flex-1 text-center">{day}</span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-700">
                <div>
                  <span className="text-stone-400 text-sm">Weekly average</span>
                  <span className="text-stone-500 text-xs ml-2">occupancy</span>
                </div>
                <span className="text-lime-400 font-black text-2xl">88%</span>
              </div>
            </div>

            {/* Room Legend */}
            <div className="rounded-3xl bg-gradient-to-br from-lime-400 to-emerald-400 p-6 shadow-xl shadow-lime-500/25">
              <h3 className="text-lg font-black text-stone-900 mb-4">Room Types</h3>
              <div className="space-y-3">
                {roomTypes.map((rt) => (
                  <div key={rt.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/80 backdrop-blur">
                    <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: rt.color }} />
                    <span className="font-bold text-stone-900 flex-1">{rt.name}</span>
                    <span className="text-sm text-stone-500">{mockBookings.filter(b => b.roomType === rt.id).length} bookings</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-5 mt-6">
            {[
              { label: 'Total Revenue', value: '$284,392', change: '+23.5%', icon: '◈', color: 'lime' },
              { label: 'Active Bookings', value: '1,847', change: '+18.2%', icon: '◎', color: 'cyan' },
              { label: 'Check-ins Today', value: '24', change: '+5', icon: '▣', color: 'violet' },
              { label: 'Avg. Rating', value: '4.92', change: '+0.3', icon: '★', color: 'amber' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`relative p-5 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer ${
                  stat.color === 'lime' ? 'bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-lime-500/20' :
                  stat.color === 'cyan' ? 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20' :
                  stat.color === 'violet' ? 'bg-gradient-to-br from-violet-400 to-purple-500 shadow-lg shadow-violet-500/20' :
                  'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20'
                }`}
              >
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
                  </div>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-white text-xs font-bold">
                  ↑ {stat.change}
                </div>
              </div>
            ))}
          </div>

          {/* Two Column Section */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Revenue Breakdown */}
            <div className="rounded-3xl bg-white border-2 border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-stone-900">Revenue Breakdown</h3>
                <select className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-sm font-medium border-0 focus:ring-2 focus:ring-lime-400">
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>This Year</option>
                </select>
              </div>

              <div className="flex gap-8">
                {/* Donut Chart */}
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f5f5f4" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#84cc16" strokeWidth="12" strokeDasharray="150.8 251.3" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#06b6d4" strokeWidth="12" strokeDasharray="62.8 251.3" strokeDashoffset="-150.8" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="37.7 251.3" strokeDashoffset="-213.6" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-black text-stone-900">$284k</span>
                    <span className="text-xs text-stone-400">Total</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Room Bookings', value: '$170,635', percent: '60%', color: '#84cc16' },
                    { label: 'Wellness & Spa', value: '$71,098', percent: '25%', color: '#06b6d4' },
                    { label: 'F&B Services', value: '$42,659', percent: '15%', color: '#8b5cf6' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-stone-700">{item.label}</span>
                          <span className="text-sm font-bold text-stone-900">{item.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: item.percent, backgroundColor: item.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Guest Analytics */}
            <div className="rounded-3xl bg-white border-2 border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-stone-900">Guest Analytics</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <span className="text-xs text-stone-400">Live</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'In-House', value: '142', icon: '🏨' },
                  { label: 'Arrivals', value: '24', icon: '✈️' },
                  { label: 'Departures', value: '18', icon: '👋' },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 rounded-2xl bg-stone-50">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="text-2xl font-black text-stone-900 mt-2">{item.value}</p>
                    <p className="text-xs text-stone-500">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div>
                <p className="text-sm font-medium text-stone-500 mb-3">Guests by Country</p>
                <div className="space-y-2">
                  {[
                    { country: '🇺🇸 United States', percent: 35 },
                    { country: '🇬🇧 United Kingdom', percent: 22 },
                    { country: '🇩🇪 Germany', percent: 18 },
                    { country: '🇫🇷 France', percent: 15 },
                    { country: '🌍 Other', percent: 10 },
                  ].map((item) => (
                    <div key={item.country} className="flex items-center gap-3">
                      <span className="text-sm text-stone-600 w-32 truncate">{item.country}</span>
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-stone-500 w-8">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Third Row - 3 Columns */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            {/* Recent Reviews */}
            <div className="rounded-3xl bg-white border-2 border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-stone-900">Recent Reviews</h3>
                <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">4.92 avg</span>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Sarah M.', rating: 5, text: 'Amazing stay! The staff was incredibly helpful.', time: '2h ago' },
                  { name: 'James L.', rating: 5, text: 'Beautiful rooms and excellent service.', time: '5h ago' },
                  { name: 'Emma W.', rating: 4, text: 'Great location, minor issues with WiFi.', time: '1d ago' },
                ].map((review, i) => (
                  <div key={i} className="p-3 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-stone-900 text-sm">{review.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, j) => (
                          <span key={j} className="text-amber-400 text-sm">★</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 line-clamp-2">{review.text}</p>
                    <p className="text-xs text-stone-400 mt-2">{review.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Wellness & Spa */}
            <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 p-6 shadow-xl shadow-violet-500/25">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Wellness & Spa</h3>
                <span className="text-violet-200 text-2xl">✦</span>
              </div>
              <div className="space-y-3">
                {[
                  { service: 'Swedish Massage', time: '10:00 AM', guest: 'Anna K.', status: 'upcoming' },
                  { service: 'Hot Stone Therapy', time: '11:30 AM', guest: 'Mark T.', status: 'upcoming' },
                  { service: 'Facial Treatment', time: '2:00 PM', guest: 'Lisa R.', status: 'booked' },
                  { service: 'Couples Massage', time: '4:00 PM', guest: 'David & Sarah', status: 'booked' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                      {item.time.split(' ')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{item.service}</p>
                      <p className="text-violet-200 text-xs">{item.guest}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      item.status === 'upcoming' ? 'bg-lime-400 text-stone-900' : 'bg-white/20 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-colors">
                View All Appointments →
              </button>
            </div>

            {/* Quick Actions */}
            <div className="rounded-3xl bg-stone-900 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '◎', label: 'Check-in', color: 'lime' },
                  { icon: '◉', label: 'Check-out', color: 'cyan' },
                  { icon: '▣', label: 'New Room', color: 'violet' },
                  { icon: '◆', label: 'Voucher', color: 'amber' },
                  { icon: '✦', label: 'Spa Book', color: 'pink' },
                  { icon: '◈', label: 'Reports', color: 'blue' },
                ].map((action) => (
                  <button
                    key={action.label}
                    className={`p-4 rounded-2xl transition-all hover:scale-105 flex flex-col items-center gap-2 ${
                      action.color === 'lime' ? 'bg-lime-400/20 hover:bg-lime-400/30 text-lime-400' :
                      action.color === 'cyan' ? 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400' :
                      action.color === 'violet' ? 'bg-violet-400/20 hover:bg-violet-400/30 text-violet-400' :
                      action.color === 'amber' ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-400' :
                      action.color === 'pink' ? 'bg-pink-400/20 hover:bg-pink-400/30 text-pink-400' :
                      'bg-blue-400/20 hover:bg-blue-400/30 text-blue-400'
                    }`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="text-xs font-bold">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Activity Feed */}
              <div className="mt-4 pt-4 border-t border-stone-700">
                <p className="text-stone-400 text-xs font-medium mb-3">Recent Activity</p>
                <div className="space-y-2">
                  {[
                    { text: 'Room 405 checked out', time: '2m ago', dot: 'lime' },
                    { text: 'New booking received', time: '15m ago', dot: 'cyan' },
                    { text: 'Spa appointment completed', time: '32m ago', dot: 'violet' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        item.dot === 'lime' ? 'bg-lime-400' :
                        item.dot === 'cyan' ? 'bg-cyan-400' : 'bg-violet-400'
                      }`} />
                      <span className="text-stone-400 text-xs flex-1">{item.text}</span>
                      <span className="text-stone-600 text-xs">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Room Status Grid */}
          <div className="mt-6 rounded-3xl bg-white border-2 border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-stone-900">Room Status Overview</h3>
              <div className="flex items-center gap-4">
                {[
                  { label: 'Occupied', color: 'bg-lime-400', count: 42 },
                  { label: 'Available', color: 'bg-stone-200', count: 12 },
                  { label: 'Cleaning', color: 'bg-amber-400', count: 6 },
                  { label: 'Maintenance', color: 'bg-red-400', count: 2 },
                ].map((status) => (
                  <div key={status.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.color}`} />
                    <span className="text-sm text-stone-600">{status.label}</span>
                    <span className="text-sm font-bold text-stone-900">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Grid */}
            <div className="grid grid-cols-12 gap-2">
              {Array.from({ length: 62 }).map((_, i) => {
                const statuses = ['occupied', 'occupied', 'occupied', 'available', 'cleaning', 'maintenance'];
                const status = statuses[i % 6] || 'occupied';
                const roomNum = 101 + i;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold cursor-pointer transition-all hover:scale-110 ${
                      status === 'occupied' ? 'bg-lime-400 text-stone-900' :
                      status === 'available' ? 'bg-stone-100 text-stone-400 hover:bg-stone-200' :
                      status === 'cleaning' ? 'bg-amber-400 text-stone-900' :
                      'bg-red-400 text-white'
                    }`}
                    title={`Room ${roomNum} - ${status}`}
                  >
                    {roomNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
