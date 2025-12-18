'use client';

import { useState } from 'react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
  color: string;
}

const stats: StatCard[] = [
  {
    title: 'Total Reservations',
    value: '1,234',
    change: '+12.5%',
    trend: 'up',
    icon: '📋',
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Active Hotels',
    value: '45',
    change: '+3',
    trend: 'up',
    icon: '🏨',
    color: 'from-green-500 to-green-600',
  },
  {
    title: 'Revenue',
    value: '$125,678',
    change: '+18.3%',
    trend: 'up',
    icon: '💰',
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: 'Pending Actions',
    value: '23',
    change: '-5',
    trend: 'down',
    icon: '⏳',
    color: 'from-orange-500 to-orange-600',
  },
];

interface RecentActivity {
  id: string;
  type: 'reservation' | 'hotel' | 'user';
  action: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

const recentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'reservation',
    action: 'New Reservation',
    description: 'Reservation #RES-001 created for Hotel Aurora',
    time: '2 minutes ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'hotel',
    action: 'Hotel Updated',
    description: 'Marina Vista hotel information updated',
    time: '15 minutes ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'reservation',
    action: 'Reservation Cancelled',
    description: 'Reservation #RES-045 cancelled by guest',
    time: '1 hour ago',
    status: 'warning',
  },
  {
    id: '4',
    type: 'user',
    action: 'New User',
    description: 'New admin user created: john.doe@example.com',
    time: '2 hours ago',
    status: 'success',
  },
];

export default function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Hotel CMS Administration</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`}
                >
                  {stat.icon}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <span>{stat.trend === 'up' ? '↑' : '↓'}</span>
                  <span>{stat.change}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-slate-600">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.status === 'success'
                        ? 'bg-green-100 text-green-600'
                        : activity.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {activity.type === 'reservation'
                      ? '📋'
                      : activity.type === 'hotel'
                      ? '🏨'
                      : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{activity.action}</p>
                    <p className="text-sm text-slate-600 truncate">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                      activity.status === 'success'
                        ? 'bg-green-500'
                        : activity.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-left">
                ➕ Create New Reservation
              </button>
              <button className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-left">
                🏨 Add New Hotel
              </button>
              <button className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-left">
                👥 Manage Users
              </button>
              <button className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-left">
                📊 View Reports
              </button>
              <button className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-left">
                ⚙️ System Settings
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div>
                <p className="font-medium text-slate-900">API Gateway</p>
                <p className="text-sm text-slate-600">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div>
                <p className="font-medium text-slate-900">Event Store</p>
                <p className="text-sm text-slate-600">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div>
                <p className="font-medium text-slate-900">Message Queue</p>
                <p className="text-sm text-slate-600">Operational</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

