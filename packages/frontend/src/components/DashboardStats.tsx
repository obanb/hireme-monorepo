'use client';

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
    title: 'Total Bookings',
    value: '1,234',
    change: '+12.5%',
    trend: 'up',
    icon: '📋',
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Occupancy Rate',
    value: '87%',
    change: '+5.2%',
    trend: 'up',
    icon: '🏨',
    color: 'from-green-500 to-green-600',
  },
  {
    title: 'Revenue',
    value: '$45,678',
    change: '+18.3%',
    trend: 'up',
    icon: '💰',
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: 'Pending Check-ins',
    value: '23',
    change: '-3',
    trend: 'down',
    icon: '🔑',
    color: 'from-orange-500 to-orange-600',
  },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
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
  );
}

