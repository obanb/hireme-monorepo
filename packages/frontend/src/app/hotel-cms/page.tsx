'use client';

import HotelSidebar from '@/components/HotelSidebar';
import DashboardStats from '@/components/DashboardStats';
import RoomCalendar from '@/components/RoomCalendar';
import RecentActivity from '@/components/RecentActivity';
import HotelLiveStatus from '@/components/HotelLiveStatus';
import { useLocale } from '@/context/LocaleContext';

export default function HotelCMSDashboard() {
  const { t } = useLocale();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />

      <main
        className="flex-1 min-h-screen flex flex-col"
        style={{
          marginLeft: 'var(--sidebar-width, 280px)',
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between h-[58px] px-8 flex-shrink-0"
          style={{
            background: 'var(--background)',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <span
            className="text-[11px] font-medium tracking-wide"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
          >
            {today}
          </span>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Live
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-8 py-8">
          <div className="max-w-[1380px] mx-auto">

            {/* Page header */}
            <div className="mb-9">
              <h1
                className="text-[2.75rem] font-bold leading-none tracking-tight mb-2"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {t('dashboard.title')}
              </h1>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {t('dashboard.welcome')}
              </p>
            </div>

            {/* Stats row */}
            <section className="mb-9">
              <DashboardStats />
            </section>

            {/* Calendar + Live Status side-by-side */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 mb-9">
              <div>
                <SectionHeader title={t('dashboard.roomCalendar')} sub={t('dashboard.roomCalendarDesc')} />
                <RoomCalendar />
              </div>
              <div>
                <SectionHeader title={t('dashboard.liveStatus')} sub={t('dashboard.liveStatusDesc')} />
                <HotelLiveStatus />
              </div>
            </div>

            {/* Recent activity */}
            <section>
              <RecentActivity />
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2
        className="text-[18px] font-semibold leading-none mb-1.5"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {sub}
      </p>
    </div>
  );
}
