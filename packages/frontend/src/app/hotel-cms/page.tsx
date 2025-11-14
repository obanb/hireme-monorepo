import { Suspense } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import DashboardStats from '@/components/DashboardStats';
import RoomCalendar from '@/components/RoomCalendar';
import LiveRates from './LiveRates';

export default function HotelCMSDashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <HotelSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Dashboard
            </h1>
            <p className="text-slate-600">
              Welcome back! Here&apos;s what&apos;s happening at your hotel today.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-8">
            <DashboardStats />
          </div>

          {/* Calendar Section */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Room Availability Calendar
              </h2>
              <p className="text-slate-600">
                View and manage bookings across all room types
              </p>
            </div>
            <RoomCalendar />
          </div>

          {/* Federated Live Data */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Federated Live Data
              </h2>
              <p className="text-slate-600">
                Server component fetching from the new GraphQL subgraph
              </p>
            </div>
            <Suspense
              fallback={
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
                  Loading live hotel rates...
                </div>
              }
            >
              <LiveRates />
            </Suspense>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {[
                {
                  action: 'New Booking',
                  guest: 'John Doe',
                  room: 'Suite #301',
                  time: '2 hours ago',
                  type: 'booking',
                },
                {
                  action: 'Check-in',
                  guest: 'Jane Smith',
                  room: 'Double Room #205',
                  time: '4 hours ago',
                  type: 'checkin',
                },
                {
                  action: 'Check-out',
                  guest: 'Bob Johnson',
                  room: 'Deluxe Suite #401',
                  time: '6 hours ago',
                  type: 'checkout',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'booking'
                        ? 'bg-blue-100 text-blue-600'
                        : activity.type === 'checkin'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {activity.type === 'booking'
                      ? '📋'
                      : activity.type === 'checkin'
                      ? '🔑'
                      : '🚪'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">
                      {activity.action}
                    </p>
                    <p className="text-sm text-slate-600">
                      {activity.guest} - {activity.room}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

