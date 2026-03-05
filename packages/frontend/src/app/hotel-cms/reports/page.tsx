'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

type ReportType = 'reservations' | 'revenue' | 'occupancy' | 'guests';
interface Toast { message: string; type: 'success' | 'error'; }

const REPORT_ICONS: Record<ReportType, React.ReactNode> = {
  reservations: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  revenue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  occupancy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  guests: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

async function gqlFetch(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query, variables }) });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data;
}

function buildReservationsQuery(f: Record<string, string>, limit: number) {
  const parts: string[] = [];
  if (f.checkInFrom) parts.push(`checkInFrom: "${f.checkInFrom}"`);
  if (f.checkInTo) parts.push(`checkInTo: "${f.checkInTo}"`);
  if (f.status && f.status !== 'ALL') parts.push(`status: ${f.status}`);
  const fa = parts.length ? `filter: { ${parts.join(', ')} }, ` : '';
  return `{ reservations(${fa}limit: ${limit}, offset: 0) { id originId guestName guestEmail status checkInDate checkOutDate totalPrice currency roomIds createdAt } }`;
}
function buildRevenueQuery(f: Record<string, string>) {
  const parts: string[] = [];
  if (f.dateFrom) parts.push(`dateFrom: "${f.dateFrom}"`);
  if (f.dateTo) parts.push(`dateTo: "${f.dateTo}"`);
  const fa = parts.length ? `(filter: { ${parts.join(', ')} })` : '';
  return `{ reservationStats${fa} { totalCount pendingCount confirmedCount cancelledCount totalRevenue averageAmount averageStayDays } revenueTimeline${fa} { month revenue } }`;
}
function buildOccupancyQuery() { return `{ roomOccupancyStats { totalRooms availableRooms occupiedRooms maintenanceRooms occupancyRate } rooms { id name roomNumber type capacity status } }`; }
function buildGuestsQuery(f: Record<string, string>, limit: number) {
  const parts: string[] = [];
  if (f.name) parts.push(`name: "${f.name}"`);
  if (f.nationality) parts.push(`nationality: "${f.nationality}"`);
  const fa = parts.length ? `filter: { ${parts.join(', ')} }, ` : '';
  return `{ guests(${fa}limit: ${limit}, offset: 0) { id email firstName lastName phone dateOfBirth nationality citizenship passportNumber purposeOfStay homeAddress { street city postalCode country } isActive createdAt } }`;
}

const RESERVATION_COLS = ['ID', 'Origin ID', 'Guest', 'Email', 'Status', 'Check-In', 'Check-Out', 'Total Price', 'Currency', 'Room IDs', 'Created'];
const GUEST_COLS = ['Email', 'First Name', 'Last Name', 'Phone', 'DOB', 'Nationality', 'Citizenship', 'Passport', 'Purpose', 'Address', 'Active', 'Created'];

function reservationRow(r: Record<string, unknown>) {
  return [r.id, r.originId ?? '', r.guestName ?? '', r.guestEmail ?? '', r.status, r.checkInDate ?? '', r.checkOutDate ?? '', r.totalPrice ?? '', r.currency ?? '', (r.roomIds as string[] ?? []).join(', '), r.createdAt ?? ''];
}
function guestRow(g: Record<string, unknown>) {
  const addr = g.homeAddress as Record<string, string> | null;
  return [g.email, g.firstName ?? '', g.lastName ?? '', g.phone ?? '', g.dateOfBirth ?? '', g.nationality ?? '', g.citizenship ?? '', g.passportNumber ?? '', g.purposeOfStay ?? '', addr ? [addr.street, addr.city, addr.postalCode, addr.country].filter(Boolean).join(', ') : '', g.isActive ? 'Yes' : 'No', g.createdAt ?? ''];
}

function downloadExcel(type: ReportType, data: unknown) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];
  if (type === 'reservations') {
    const ws = XLSX.utils.aoa_to_sheet([RESERVATION_COLS, ...(data as Record<string, unknown>[]).map(reservationRow)]);
    XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
  } else if (type === 'revenue') {
    const d = data as { stats: Record<string, unknown>; timeline: Record<string, unknown>[] };
    const ws = XLSX.utils.aoa_to_sheet([['Total Revenue', 'Avg Amount', 'Total Bookings', 'Avg Stay Days'], [d.stats.totalRevenue, d.stats.averageAmount, d.stats.totalCount, d.stats.averageStayDays], [], ['Month', 'Revenue'], ...d.timeline.map(t => [t.month, t.revenue])]);
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
  } else if (type === 'occupancy') {
    const d = data as { stats: Record<string, unknown>; rooms: Record<string, unknown>[] };
    const ws = XLSX.utils.aoa_to_sheet([['Total Rooms', 'Available', 'Occupied', 'Maintenance', 'Rate %'], [d.stats.totalRooms, d.stats.availableRooms, d.stats.occupiedRooms, d.stats.maintenanceRooms, d.stats.occupancyRate], [], ['Room #', 'Name', 'Type', 'Capacity', 'Status'], ...d.rooms.map(r => [r.roomNumber, r.name, r.type, r.capacity, r.status])]);
    XLSX.utils.book_append_sheet(wb, ws, 'Occupancy');
  } else {
    const ws = XLSX.utils.aoa_to_sheet([GUEST_COLS, ...(data as Record<string, unknown>[]).map(guestRow)]);
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  }
  XLSX.writeFile(wb, `${type}-${dateStr}.xlsx`);
}

function defaultFilters(type: ReportType): Record<string, string> {
  switch (type) {
    case 'reservations': return { checkInFrom: '', checkInTo: '', status: 'ALL' };
    case 'revenue': return { dateFrom: '', dateTo: '' };
    case 'occupancy': return {};
    case 'guests': return { name: '', nationality: '' };
  }
}

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };
const mainStyle = { marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' };

const ROOM_STATUS_COLORS: Record<string, string> = { AVAILABLE: '#4ADE80', OCCUPIED: '#A78BFA', MAINTENANCE: '#FBBF24' };

export default function ReportsPage() {
  const { t } = useLocale();
  const [reportType, setReportType] = useState<ReportType>('reservations');
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters('reservations'));
  const [previewData, setPreviewData] = useState<unknown[] | null>(null);
  const [previewMeta, setPreviewMeta] = useState<Record<string, unknown> | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const switchType = (type: ReportType) => {
    setReportType(type); setFilters(defaultFilters(type)); setPreviewData(null); setPreviewMeta(null); setRowCount(0);
  };

  const updateFilter = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  const fetchReport = useCallback(async (type: ReportType, f: Record<string, string>, limit: number) => {
    if (type === 'reservations') { const d = await gqlFetch(buildReservationsQuery(f, limit)); return { rows: d.reservations, count: d.reservations.length }; }
    if (type === 'revenue') { const d = await gqlFetch(buildRevenueQuery(f)); return { meta: { stats: d.reservationStats, timeline: d.revenueTimeline }, rows: d.revenueTimeline, count: d.revenueTimeline.length }; }
    if (type === 'occupancy') { const d = await gqlFetch(buildOccupancyQuery()); return { meta: { stats: d.roomOccupancyStats, rooms: d.rooms }, rows: d.rooms, count: d.rooms.length }; }
    const d = await gqlFetch(buildGuestsQuery(f, limit)); return { rows: d.guests, count: d.guests.length };
  }, []);

  const handlePreview = async () => {
    setLoading(true);
    try { const r = await fetchReport(reportType, filters, 20); setPreviewData(r.rows); setPreviewMeta(r.meta ?? null); setRowCount(r.count); }
    catch (err) { setToast({ message: err instanceof Error ? err.message : 'Failed', type: 'error' }); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await fetchReport(reportType, filters, 10000);
      if (reportType === 'revenue' || reportType === 'occupancy') downloadExcel(reportType, r.meta);
      else downloadExcel(reportType, r.rows);
      setToast({ message: `Downloaded ${r.count} rows`, type: 'success' });
    } catch (err) { setToast({ message: err instanceof Error ? err.message : 'Failed', type: 'error' }); }
    finally { setDownloading(false); }
  };

  const thStyle = { color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)', background: 'var(--background)' };
  const tdStyle = { color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border)' };

  function renderPreviewTable() {
    if (!previewData || previewData.length === 0) {
      return <div style={{ color: 'var(--text-muted)' }} className="p-12 text-center text-[13px]">{t('reports.noData')}</div>;
    }
    if (reportType === 'reservations') {
      return (
        <table className="w-full text-[12px]">
          <thead><tr>{RESERVATION_COLS.map(c => <th key={c} className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em]" style={thStyle}>{c}</th>)}</tr></thead>
          <tbody>{(previewData as Record<string, unknown>[]).map((r, i) => <tr key={i}>{reservationRow(r).map((cell, j) => <td key={j} className="px-4 py-2.5 whitespace-nowrap" style={tdStyle}>{String(cell)}</td>)}</tr>)}</tbody>
        </table>
      );
    }
    if (reportType === 'revenue') {
      const meta = previewMeta as { stats: Record<string, unknown>; timeline: Record<string, unknown>[] } | null;
      if (!meta) return null;
      return (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-4 gap-3">
            {[['Total Revenue', meta.stats.totalRevenue], ['Avg Amount', meta.stats.averageAmount], ['Total Bookings', meta.stats.totalCount], ['Avg Stay Days', meta.stats.averageStayDays]].map(([label, val]) => (
              <div key={String(label)} style={{ background: 'var(--background)', border: '1px solid var(--card-border)' }} className="rounded-lg p-3">
                <p style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-[0.15em] mb-1">{String(label)}</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-[1.1rem] font-bold">{typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-[12px]">
            <thead><tr><th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em]" style={thStyle}>Month</th><th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em]" style={thStyle}>Revenue</th></tr></thead>
            <tbody>{meta.timeline.map((t, i) => <tr key={i}><td className="px-4 py-2.5" style={tdStyle}>{String(t.month)}</td><td className="px-4 py-2.5" style={tdStyle}>{Number(t.revenue).toLocaleString()}</td></tr>)}</tbody>
          </table>
        </div>
      );
    }
    if (reportType === 'occupancy') {
      const meta = previewMeta as { stats: Record<string, unknown>; rooms: Record<string, unknown>[] } | null;
      if (!meta) return null;
      return (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-5 gap-3">
            {[['Total', meta.stats.totalRooms], ['Available', meta.stats.availableRooms], ['Occupied', meta.stats.occupiedRooms], ['Maintenance', meta.stats.maintenanceRooms], ['Rate %', meta.stats.occupancyRate]].map(([label, val]) => (
              <div key={String(label)} style={{ background: 'var(--background)', border: '1px solid var(--card-border)' }} className="rounded-lg p-3">
                <p style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-[0.15em] mb-1">{String(label)}</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-[1.1rem] font-bold">{typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-[12px]">
            <thead><tr>{['Room #', 'Name', 'Type', 'Capacity', 'Status'].map(c => <th key={c} className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em]" style={thStyle}>{c}</th>)}</tr></thead>
            <tbody>{meta.rooms.map((r, i) => (
              <tr key={i}><td className="px-4 py-2.5" style={tdStyle}>{String(r.roomNumber)}</td><td className="px-4 py-2.5" style={tdStyle}>{String(r.name)}</td><td className="px-4 py-2.5" style={tdStyle}>{String(r.type)}</td><td className="px-4 py-2.5" style={tdStyle}>{String(r.capacity)}</td>
                <td className="px-4 py-2.5" style={tdStyle}>
                  <span style={{ color: ROOM_STATUS_COLORS[String(r.status)] ?? 'var(--text-muted)', background: (ROOM_STATUS_COLORS[String(r.status)] ?? '#888') + '1A' }} className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase">{String(r.status)}</span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
    }
    return (
      <table className="w-full text-[12px]">
        <thead><tr>{GUEST_COLS.map(c => <th key={c} className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em]" style={thStyle}>{c}</th>)}</tr></thead>
        <tbody>{(previewData as Record<string, unknown>[]).map((g, i) => <tr key={i}>{guestRow(g).map((cell, j) => <td key={j} className="px-4 py-2.5 whitespace-nowrap" style={tdStyle}>{String(cell)}</td>)}</tr>)}</tbody>
      </table>
    );
  }

  function renderFilters() {
    if (reportType === 'reservations') return (
      <>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('vouchers.from')}</label><input type="date" value={filters.checkInFrom} onChange={e => updateFilter('checkInFrom', e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} /></div>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('vouchers.to')}</label><input type="date" value={filters.checkInTo} onChange={e => updateFilter('checkInTo', e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} /></div>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('common.status')}</label>
          <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle}>
            <option value="ALL">{t('common.all')}</option><option value="PENDING">{t('filters.pending')}</option><option value="CONFIRMED">{t('filters.confirmed')}</option><option value="CANCELLED">{t('filters.cancelled')}</option>
          </select>
        </div>
      </>
    );
    if (reportType === 'revenue') return (
      <>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('vouchers.from')}</label><input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} /></div>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('vouchers.to')}</label><input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} /></div>
      </>
    );
    if (reportType === 'occupancy') return <p style={{ color: 'var(--text-muted)' }} className="text-[12px] italic">{t('reports.noFilters')}</p>;
    return (
      <>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('common.name')}</label><input type="text" value={filters.name} onChange={e => updateFilter('name', e.target.value)} placeholder={t('guests.searchPlaceholder')} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} /></div>
        <div className="flex items-center gap-2"><label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('guests.nationality')}</label><input type="text" value={filters.nationality} onChange={e => updateFilter('nationality', e.target.value)} placeholder="e.g. Czech" className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} /></div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">{t('reports.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mb-8">{t('reports.subtitle')}</p>

          {/* Report type selector */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {(['reservations', 'revenue', 'occupancy', 'guests'] as ReportType[]).map(type => (
              <button key={type} onClick={() => switchType(type)}
                style={reportType === type
                  ? { background: 'var(--surface)', border: '1px solid var(--gold)', color: 'var(--gold)' }
                  : { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
                className="text-left p-5 rounded-xl transition-all hover:opacity-90">
                <span style={{ color: reportType === type ? 'var(--gold)' : 'var(--text-muted)' }}>{REPORT_ICONS[type]}</span>
                <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold mt-3 mb-1">
                  {t(`reports.${type}` as 'reports.reservations' | 'reports.revenue' | 'reports.occupancy' | 'reports.guests')}
                </h3>
                <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                  {t(`reports.${type}Desc` as 'reports.reservationsDesc' | 'reports.revenueDesc' | 'reports.occupancyDesc' | 'reports.guestsDesc')}
                </p>
              </button>
            ))}
          </div>

          {/* Filter panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-4 mb-5 flex flex-wrap items-center gap-4">
            {renderFilters()}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={handlePreview} disabled={loading}
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
              className="px-4 py-2 rounded-md text-[12.5px] font-medium hover:opacity-80 disabled:opacity-50">
              {loading ? t('common.loading') : t('reports.generate')}
            </button>
            <button onClick={handleDownload} disabled={downloading}
              style={{ background: 'var(--gold)', color: 'var(--background)' }}
              className="px-4 py-2 rounded-md text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" /><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" /></svg>
              {downloading ? t('reports.generating') : t('reports.export')}
            </button>
            {rowCount > 0 && <span style={{ color: 'var(--text-muted)' }} className="text-[12px]">{rowCount} rows loaded</span>}
          </div>

          {/* Preview table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} />
              </div>
            ) : previewData === null ? (
              <div style={{ color: 'var(--text-muted)' }} className="p-16 text-center text-[13px]">
                Click &quot;{t('reports.generate')}&quot; to preview, or &quot;{t('reports.export')}&quot; to download directly.
              </div>
            ) : renderPreviewTable()}
          </div>
        </div>
      </main>

      {toast && (
        <div style={{ background: toast.type === 'success' ? '#4ADE80' : '#FB7185', color: '#0a0a0a' }}
          className="fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-[13px] font-semibold">
          {toast.message}
        </div>
      )}
    </div>
  );
}
