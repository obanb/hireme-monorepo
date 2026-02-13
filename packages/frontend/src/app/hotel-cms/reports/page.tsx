'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

type ReportType = 'reservations' | 'revenue' | 'occupancy' | 'guests';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const REPORT_CARDS: { type: ReportType; label: string; description: string; icon: string }[] = [
  { type: 'reservations', label: 'Reservations', description: 'Export bookings with guest & room details', icon: '▣' },
  { type: 'revenue', label: 'Revenue', description: 'Monthly revenue breakdown', icon: '◉' },
  { type: 'occupancy', label: 'Occupancy', description: 'Room occupancy overview', icon: '▤' },
  { type: 'guests', label: 'Guests', description: 'Guest directory with contact info', icon: '◐' },
];

// ─── GraphQL helpers ───────────────────────────────────────────────

async function gqlFetch(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data;
}

// ─── Query builders per report type ────────────────────────────────

function buildReservationsQuery(filters: Record<string, string>, limit: number) {
  const parts: string[] = [];
  if (filters.checkInFrom) parts.push(`checkInFrom: "${filters.checkInFrom}"`);
  if (filters.checkInTo) parts.push(`checkInTo: "${filters.checkInTo}"`);
  if (filters.status && filters.status !== 'ALL') parts.push(`status: ${filters.status}`);
  const filterArg = parts.length ? `filter: { ${parts.join(', ')} }, ` : '';
  return `{ reservations(${filterArg}limit: ${limit}, offset: 0) {
    id originId guestName guestEmail status checkInDate checkOutDate totalAmount currency roomId createdAt
  } }`;
}

function buildRevenueQuery(filters: Record<string, string>) {
  const parts: string[] = [];
  if (filters.dateFrom) parts.push(`dateFrom: "${filters.dateFrom}"`);
  if (filters.dateTo) parts.push(`dateTo: "${filters.dateTo}"`);
  const filterArg = parts.length ? `(filter: { ${parts.join(', ')} })` : '';
  return `{
    reservationStats${filterArg} { totalCount pendingCount confirmedCount cancelledCount totalRevenue averageAmount averageStayDays }
    revenueTimeline${filterArg} { month revenue }
  }`;
}

function buildOccupancyQuery() {
  return `{
    roomOccupancyStats { totalRooms availableRooms occupiedRooms maintenanceRooms occupancyRate }
    rooms { id name roomNumber type capacity status }
  }`;
}

function buildGuestsQuery(filters: Record<string, string>, limit: number) {
  const parts: string[] = [];
  if (filters.name) parts.push(`name: "${filters.name}"`);
  if (filters.nationality) parts.push(`nationality: "${filters.nationality}"`);
  const filterArg = parts.length ? `filter: { ${parts.join(', ')} }, ` : '';
  return `{ guests(${filterArg}limit: ${limit}, offset: 0) {
    id email firstName lastName phone dateOfBirth nationality citizenship passportNumber purposeOfStay
    homeAddress { street city postalCode country }
    isActive createdAt
  } }`;
}

// ─── Table column definitions ──────────────────────────────────────

const RESERVATION_COLS = ['ID', 'Origin ID', 'Guest', 'Email', 'Status', 'Check-In', 'Check-Out', 'Amount', 'Currency', 'Room ID', 'Created'];
const GUEST_COLS = ['Email', 'First Name', 'Last Name', 'Phone', 'DOB', 'Nationality', 'Citizenship', 'Passport', 'Purpose', 'Address', 'Active', 'Created'];

function reservationRow(r: Record<string, unknown>) {
  return [r.id, r.originId ?? '', r.guestName ?? '', r.guestEmail ?? '', r.status, r.checkInDate ?? '', r.checkOutDate ?? '', r.totalAmount ?? '', r.currency ?? '', r.roomId ?? '', r.createdAt ?? ''];
}

function guestRow(g: Record<string, unknown>) {
  const addr = g.homeAddress as Record<string, string> | null;
  const addrStr = addr ? [addr.street, addr.city, addr.postalCode, addr.country].filter(Boolean).join(', ') : '';
  return [g.email, g.firstName ?? '', g.lastName ?? '', g.phone ?? '', g.dateOfBirth ?? '', g.nationality ?? '', g.citizenship ?? '', g.passportNumber ?? '', g.purposeOfStay ?? '', addrStr, g.isActive ? 'Yes' : 'No', g.createdAt ?? ''];
}

// ─── Excel generation ──────────────────────────────────────────────

function downloadExcel(type: ReportType, data: unknown) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  if (type === 'reservations') {
    const rows = (data as Record<string, unknown>[]).map(reservationRow);
    const ws = XLSX.utils.aoa_to_sheet([RESERVATION_COLS, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
  } else if (type === 'revenue') {
    const d = data as { stats: Record<string, unknown>; timeline: Record<string, unknown>[] };
    const aoa = [
      ['Total Revenue', 'Avg Amount', 'Total Bookings', 'Avg Stay Days'],
      [d.stats.totalRevenue, d.stats.averageAmount, d.stats.totalCount, d.stats.averageStayDays],
      [],
      ['Month', 'Revenue'],
      ...d.timeline.map((t) => [t.month, t.revenue]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
  } else if (type === 'occupancy') {
    const d = data as { stats: Record<string, unknown>; rooms: Record<string, unknown>[] };
    const aoa = [
      ['Total Rooms', 'Available', 'Occupied', 'Maintenance', 'Rate %'],
      [d.stats.totalRooms, d.stats.availableRooms, d.stats.occupiedRooms, d.stats.maintenanceRooms, d.stats.occupancyRate],
      [],
      ['Room #', 'Name', 'Type', 'Capacity', 'Status'],
      ...d.rooms.map((r) => [r.roomNumber, r.name, r.type, r.capacity, r.status]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Occupancy');
  } else {
    const rows = (data as Record<string, unknown>[]).map(guestRow);
    const ws = XLSX.utils.aoa_to_sheet([GUEST_COLS, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  }

  XLSX.writeFile(wb, `${type}-${dateStr}.xlsx`);
}

// ─── Default filter state ──────────────────────────────────────────

function defaultFilters(type: ReportType): Record<string, string> {
  switch (type) {
    case 'reservations': return { checkInFrom: '', checkInTo: '', status: 'ALL' };
    case 'revenue': return { dateFrom: '', dateTo: '' };
    case 'occupancy': return {};
    case 'guests': return { name: '', nationality: '' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

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

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const switchType = (type: ReportType) => {
    setReportType(type);
    setFilters(defaultFilters(type));
    setPreviewData(null);
    setPreviewMeta(null);
    setRowCount(0);
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ── Fetch data ───────────────────────────────────────────────────

  const fetchReport = useCallback(async (type: ReportType, f: Record<string, string>, limit: number) => {
    if (type === 'reservations') {
      const d = await gqlFetch(buildReservationsQuery(f, limit));
      return { rows: d.reservations, count: d.reservations.length };
    }
    if (type === 'revenue') {
      const d = await gqlFetch(buildRevenueQuery(f));
      return { meta: { stats: d.reservationStats, timeline: d.revenueTimeline }, rows: d.revenueTimeline, count: d.revenueTimeline.length };
    }
    if (type === 'occupancy') {
      const d = await gqlFetch(buildOccupancyQuery());
      return { meta: { stats: d.roomOccupancyStats, rooms: d.rooms }, rows: d.rooms, count: d.rooms.length };
    }
    // guests
    const d = await gqlFetch(buildGuestsQuery(f, limit));
    return { rows: d.guests, count: d.guests.length };
  }, []);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await fetchReport(reportType, filters, 20);
      setPreviewData(result.rows);
      setPreviewMeta(result.meta ?? null);
      setRowCount(result.count);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to load preview', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await fetchReport(reportType, filters, 10000);
      if (reportType === 'revenue') {
        downloadExcel('revenue', result.meta);
      } else if (reportType === 'occupancy') {
        downloadExcel('occupancy', result.meta);
      } else {
        downloadExcel(reportType, result.rows);
      }
      setToast({ message: `Downloaded ${result.count} rows as Excel`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to download', type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  // ── Preview table renderers ──────────────────────────────────────

  function renderPreviewTable() {
    if (!previewData || previewData.length === 0) {
      return (
        <div className="p-12 text-center text-stone-400">
          <div className="text-4xl mb-3">&#9776;</div>
          <p>{t('reports.noData')}</p>
        </div>
      );
    }

    if (reportType === 'reservations') {
      const rows = previewData as Record<string, unknown>[];
      return (
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
            <tr>{RESERVATION_COLS.map((c) => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-700">
                {reservationRow(r).map((cell, j) => <td key={j} className="px-4 py-2.5 text-stone-700 dark:text-stone-300 whitespace-nowrap">{String(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === 'revenue') {
      const meta = previewMeta as { stats: Record<string, unknown>; timeline: Record<string, unknown>[] } | null;
      if (!meta) return null;
      return (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              ['Total Revenue', meta.stats.totalRevenue],
              ['Avg Amount', meta.stats.averageAmount],
              ['Total Bookings', meta.stats.totalCount],
              ['Avg Stay Days', meta.stats.averageStayDays],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs text-stone-500">{String(label)}</p>
                <p className="text-lg font-bold text-stone-800">{typeof val === 'number' ? val.toLocaleString() : String(val ?? '-')}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {meta.timeline.map((t, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-stone-700">{String(t.month)}</td>
                  <td className="px-4 py-2.5 text-stone-700">{Number(t.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === 'occupancy') {
      const meta = previewMeta as { stats: Record<string, unknown>; rooms: Record<string, unknown>[] } | null;
      if (!meta) return null;
      return (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-5 gap-4">
            {[
              ['Total Rooms', meta.stats.totalRooms],
              ['Available', meta.stats.availableRooms],
              ['Occupied', meta.stats.occupiedRooms],
              ['Maintenance', meta.stats.maintenanceRooms],
              ['Rate %', meta.stats.occupancyRate],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs text-stone-500">{String(label)}</p>
                <p className="text-lg font-bold text-stone-800">{typeof val === 'number' ? val.toLocaleString() : String(val ?? '-')}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {['Room #', 'Name', 'Type', 'Capacity', 'Status'].map((c) => (
                  <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {meta.rooms.map((r, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-stone-700">{String(r.roomNumber)}</td>
                  <td className="px-4 py-2.5 text-stone-700">{String(r.name)}</td>
                  <td className="px-4 py-2.5 text-stone-700">{String(r.type)}</td>
                  <td className="px-4 py-2.5 text-stone-700">{String(r.capacity)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                      r.status === 'OCCUPIED' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{String(r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // guests
    const rows = previewData as Record<string, unknown>[];
    return (
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>{GUEST_COLS.map((c) => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((g, i) => (
            <tr key={i} className="hover:bg-stone-50">
              {guestRow(g).map((cell, j) => <td key={j} className="px-4 py-2.5 text-stone-700 whitespace-nowrap">{String(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ── Filter panel ─────────────────────────────────────────────────

  function renderFilters() {
    if (reportType === 'reservations') {
      return (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('vouchers.from')}</label>
            <input type="date" value={filters.checkInFrom} onChange={(e) => updateFilter('checkInFrom', e.target.value)}
              className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:bg-stone-800 dark:text-stone-100" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('vouchers.to')}</label>
            <input type="date" value={filters.checkInTo} onChange={(e) => updateFilter('checkInTo', e.target.value)}
              className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:bg-stone-800 dark:text-stone-100" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('common.status')}</label>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 bg-white dark:bg-stone-800 dark:text-stone-100">
              <option value="ALL">{t('common.all')}</option>
              <option value="PENDING">{t('filters.pending')}</option>
              <option value="CONFIRMED">{t('filters.confirmed')}</option>
              <option value="CANCELLED">{t('filters.cancelled')}</option>
            </select>
          </div>
        </>
      );
    }
    if (reportType === 'revenue') {
      return (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('vouchers.from')}</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:bg-stone-800 dark:text-stone-100" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('vouchers.to')}</label>
            <input type="date" value={filters.dateTo} onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:bg-stone-800 dark:text-stone-100" />
          </div>
        </>
      );
    }
    if (reportType === 'occupancy') {
      return <p className="text-sm text-stone-400 italic">{t('reports.noFilters')}</p>;
    }
    // guests
    return (
      <>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('common.name')}</label>
          <input type="text" value={filters.name} onChange={(e) => updateFilter('name', e.target.value)} placeholder={t('guests.searchPlaceholder')}
            className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:bg-stone-800 dark:text-stone-100" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('guests.nationality')}</label>
          <input type="text" value={filters.nationality} onChange={(e) => updateFilter('nationality', e.target.value)} placeholder="e.g. Czech"
            className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:bg-stone-800 dark:text-stone-100" />
        </div>
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">{t('reports.title')}</h1>
            <p className="text-stone-500 dark:text-stone-400 mt-1">{t('reports.subtitle')}</p>
          </div>

          {/* Report type selector */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {REPORT_CARDS.map((card) => (
              <button
                key={card.type}
                onClick={() => switchType(card.type)}
                className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  reportType === card.type
                    ? 'border-lime-400 bg-white dark:bg-stone-800 shadow-lg shadow-lime-100 dark:shadow-stone-900/50'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <span className={`text-2xl ${reportType === card.type ? 'text-lime-500' : 'text-stone-400'}`}>{card.icon}</span>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 mt-2">{t(`reports.${card.type}` as 'reports.reservations' | 'reports.revenue' | 'reports.occupancy' | 'reports.guests')}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{t(`reports.${card.type}Desc` as 'reports.reservationsDesc' | 'reports.revenueDesc' | 'reports.occupancyDesc' | 'reports.guestsDesc')}</p>
              </button>
            ))}
          </div>

          {/* Filter panel */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 mb-6 flex flex-wrap items-center gap-4 shadow-sm">
            {renderFilters()}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="px-5 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('reports.generate')}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {downloading ? t('reports.generating') : t('reports.export')}
            </button>
            {rowCount > 0 && (
              <span className="text-sm text-stone-500 dark:text-stone-400">{rowCount} rows loaded</span>
            )}
          </div>

          {/* Preview table */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full" />
              </div>
            ) : previewData === null ? (
              <div className="p-12 text-center text-stone-400">
                <div className="text-4xl mb-3">&#9783;</div>
                <p>Click &quot;Load Preview&quot; to see data, or &quot;Download Excel&quot; to export directly.</p>
              </div>
            ) : (
              renderPreviewTable()
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {toast.message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
