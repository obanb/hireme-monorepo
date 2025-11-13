'use client';

import { useState, useMemo } from 'react';

interface Booking {
  id: string;
  roomType: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface RoomType {
  id: string;
  name: string;
  color: string;
  capacity: number;
}

const roomTypes: RoomType[] = [
  { id: 'single', name: 'Single Room', color: '#3b82f6', capacity: 1 },
  { id: 'double', name: 'Double Room', color: '#10b981', capacity: 2 },
  { id: 'suite', name: 'Suite', color: '#f59e0b', capacity: 4 },
  { id: 'deluxe', name: 'Deluxe Suite', color: '#8b5cf6', capacity: 6 },
  { id: 'penthouse', name: 'Penthouse', color: '#ef4444', capacity: 8 },
];

// Generate mock bookings relative to today
const generateMockBookings = (): Booking[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return [
    {
      id: '1',
      roomType: 'single',
      guestName: 'John Doe',
      checkIn: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      checkOut: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'confirmed',
    },
    {
      id: '2',
      roomType: 'double',
      guestName: 'Jane Smith',
      checkIn: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      checkOut: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'confirmed',
    },
    {
      id: '3',
      roomType: 'suite',
      guestName: 'Bob Johnson',
      checkIn: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      checkOut: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
      status: 'pending',
    },
    {
      id: '4',
      roomType: 'deluxe',
      guestName: 'Alice Williams',
      checkIn: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      checkOut: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      status: 'confirmed',
    },
    {
      id: '5',
      roomType: 'penthouse',
      guestName: 'Michael Brown',
      checkIn: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      checkOut: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      status: 'confirmed',
    },
  ];
};

export default function RoomCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>(
    roomTypes.map((rt) => rt.id)
  );
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [mockBookings] = useState<Booking[]>(generateMockBookings());

  const startOfWeek = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
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
      // Month view - show full calendar grid (35 days = 5 weeks)
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDay = firstDay.getDay();
      const adjustedStart = startDay === 0 ? 6 : startDay - 1; // Monday = 0
      const daysInMonth = lastDay.getDate();
      const totalDays = Math.ceil((adjustedStart + daysInMonth) / 7) * 7; // Round up to full weeks
      
      return Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(firstDay);
        date.setDate(date.getDate() + i - adjustedStart);
        return date;
      });
    }
  }, [currentDate, startOfWeek, viewMode]);

  const filteredBookings = useMemo(() => {
    return mockBookings.filter((booking) =>
      selectedRoomTypes.includes(booking.roomType)
    );
  }, [selectedRoomTypes, mockBookings]);

  const getBookingsForDate = (date: Date) => {
    return filteredBookings.filter((booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= checkIn && date < checkOut;
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

  const toggleRoomType = (roomTypeId: string) => {
    setSelectedRoomTypes((prev) =>
      prev.includes(roomTypeId)
        ? prev.filter((id) => id !== roomTypeId)
        : [...prev, roomTypeId]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <h2 className="text-2xl font-bold text-slate-800">
            {viewMode === 'week'
              ? `${formatDate(startOfWeek)} - ${formatDate(daysInView[6])}`
              : currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            →
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Room Type Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {roomTypes.map((roomType) => (
          <button
            key={roomType.id}
            onClick={() => toggleRoomType(roomType.id)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              selectedRoomTypes.includes(roomType.id)
                ? 'bg-slate-100 border-2 border-slate-300'
                : 'bg-slate-50 border-2 border-transparent opacity-50'
            }`}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: roomType.color }}
            />
            <span className="text-sm font-medium text-slate-700">
              {roomType.name}
            </span>
          </button>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysInView.slice(0, 7).map((date, idx) => (
              <div
                key={idx}
                className="text-center py-2 font-semibold text-slate-600 text-sm"
              >
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                <div className="text-xs text-slate-400 mt-1">
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="grid grid-cols-7 gap-2">
            {daysInView.map((date, idx) => {
              const bookings = getBookingsForDate(date);
              const today = isToday(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={idx}
                  className={`min-h-[120px] border-2 rounded-lg p-2 ${
                    today
                      ? 'border-blue-500 bg-blue-50'
                      : isCurrentMonth
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-slate-100 bg-slate-50 opacity-50'
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-2 ${
                      today
                        ? 'text-blue-600'
                        : isCurrentMonth
                        ? 'text-slate-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {bookings.map((booking) => {
                      const roomType = roomTypes.find(
                        (rt) => rt.id === booking.roomType
                      );
                      return (
                        <div
                          key={booking.id}
                          className="text-xs p-1.5 rounded text-white font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: roomType?.color || '#gray',
                            opacity: booking.status === 'cancelled' ? 0.5 : 1,
                          }}
                          title={`${roomType?.name} - ${booking.guestName} (${booking.checkIn.toLocaleDateString()} - ${booking.checkOut.toLocaleDateString()})`}
                        >
                          <div className="font-semibold">{roomType?.name}</div>
                          <div className="text-xs opacity-90">
                            {booking.guestName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-slate-600">Status:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-sm text-slate-600">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span className="text-sm text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded opacity-50" />
            <span className="text-sm text-slate-600">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}

