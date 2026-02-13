'use client';

import { Suspense } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import DashboardStats from '@/components/DashboardStats';
import RoomCalendar from '@/components/RoomCalendar';
import RecentActivity from '@/components/RecentActivity';
import { useLocale } from '@/context/LocaleContext';

export default function HotelCMSDashboard() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">
              {t('dashboard.title')}
            </h1>
            <p className="text-stone-500 dark:text-stone-400">
              {t('dashboard.welcome')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-8">
            <DashboardStats />
          </div>

          {/* Calendar Section */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-2">
                {t('dashboard.roomCalendar')}
              </h2>
              <p className="text-stone-500 dark:text-stone-400">
                {t('dashboard.roomCalendarDesc')}
              </p>
            </div>
            <RoomCalendar />
          </div>

          {/* Federated Live Data */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-2">
                {t('dashboard.liveData')}
              </h2>
              <p className="text-stone-500 dark:text-stone-400">
                {t('dashboard.liveDataDesc')}
              </p>
            </div>
            <Suspense
              fallback={
                <div className="rounded-3xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 text-stone-500 dark:text-stone-400">
                  {t('dashboard.loadingRates')}
                </div>
              }
            >
              {/* LiveRates is a server component - can't import here in use client, wrap separately if needed */}
              <div className="rounded-3xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 text-stone-500 dark:text-stone-400">
                {t('dashboard.loadingRates')}
              </div>
            </Suspense>
          </div>

          {/* Recent Activity Section */}
          <div className="mb-8">
            <RecentActivity />
          </div>
        </div>
      </main>
    </div>
  );
}
