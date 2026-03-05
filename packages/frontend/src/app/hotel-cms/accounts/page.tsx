'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface Account {
  id: number;
  streamId: string;
  reservationId: string;
  totalPrice: number;
  payedPrice: number;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccountFilter {
  reservationId: string;
  minTotal: string;
  maxTotal: string;
  createdFrom: string;
  createdTo: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const emptyFilter: AccountFilter = {
  reservationId: '',
  minTotal: '',
  maxTotal: '',
  createdFrom: '',
  createdTo: '',
};

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function RefreshIcon({ spin }: { spin?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={spin ? 'animate-spin' : ''}>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function ChevronIcon({ up }: { up?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={up ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

export default function AccountsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AccountFilter>(emptyFilter);
  const [appliedFilters, setAppliedFilters] = useState<AccountFilter>(emptyFilter);

  const buildFilterInput = useCallback((f: AccountFilter) => {
    const filter: Record<string, string | number> = {};
    if (f.reservationId) filter.reservationId = f.reservationId;
    if (f.minTotal) filter.minTotal = parseFloat(f.minTotal);
    if (f.maxTotal) filter.maxTotal = parseFloat(f.maxTotal);
    if (f.createdFrom) filter.createdFrom = f.createdFrom;
    if (f.createdTo) filter.createdTo = f.createdTo;
    return Object.keys(filter).length > 0 ? filter : null;
  }, []);

  const fetchAccounts = useCallback(async (filterToApply?: AccountFilter) => {
    try {
      setLoading(true);
      const filterInput = buildFilterInput(filterToApply ?? appliedFilters);

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query ListAccounts($filter: AccountFilterInput) {
              accounts(filter: $filter) {
                id streamId reservationId totalPrice payedPrice currency createdAt updatedAt
              }
            }
          `,
          variables: { filter: filterInput },
        }),
      });

      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to fetch accounts');
      setAccounts(result.data?.accounts ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, buildFilterInput]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    fetchAccounts(filters);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilter);
    setAppliedFilters(emptyFilter);
    fetchAccounts(emptyFilter);
  };

  const activeFilterCount = Object.values(appliedFilters).filter(v => v !== '').length;

  const formatCurrency = (amount: number, currency: string | null) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: currency || 'EUR' });

  const getPaymentStatus = (total: number, payed: number) => {
    if (payed >= total) return { label: t('accounts.paid'), color: '#4ADE80' };
    if (payed > 0) return { label: t('accounts.partial'), color: '#FBBF24' };
    return { label: t('accounts.unpaid'), color: '#FB7185' };
  };

  const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main
        className="flex-1 px-8 py-8"
        style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                className="text-[2.75rem] font-bold tracking-tight mb-1"
              >
                {t('accounts.title')}
              </h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('accounts.subtitle')}</p>
            </div>
            <button
              onClick={() => fetchAccounts()}
              disabled={loading}
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[12.5px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <RefreshIcon spin={loading} />
              {t('common.refresh')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }}
              className="px-4 py-3 rounded-md text-[13px] flex items-center justify-between mb-5"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 hover:opacity-70">✕</button>
            </div>
          )}

          {/* Filters Panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl mb-5 overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-muted)' }}><FilterIcon /></span>
                <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">{t('common.filters')}</span>
                {activeFilterCount > 0 && (
                  <span
                    style={{ color: 'var(--gold)', background: 'rgba(201,169,110,0.15)' }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  >
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)' }}><ChevronIcon up={showFilters} /></span>
            </button>

            {showFilters && (
              <div style={{ borderTop: '1px solid var(--card-border)' }} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: t('accounts.reservationId'), key: 'reservationId', type: 'text', placeholder: 'UUID...' },
                    { label: t('accounts.minTotal'), key: 'minTotal', type: 'number', placeholder: '0.00' },
                    { label: t('accounts.maxTotal'), key: 'maxTotal', type: 'number', placeholder: '9999.00' },
                    { label: t('filters.createdFrom'), key: 'createdFrom', type: 'date', placeholder: '' },
                    { label: t('filters.createdTo'), key: 'createdTo', type: 'date', placeholder: '' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">
                        {label}
                      </label>
                      <input
                        type={type}
                        value={filters[key as keyof AccountFilter]}
                        onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]"
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <button
                    onClick={handleClearFilters}
                    style={{ color: 'var(--text-secondary)' }}
                    className="px-4 py-2 text-[12.5px] font-medium rounded-md hover:opacity-70 transition-opacity"
                  >
                    {t('common.clearAll')}
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    style={{ background: 'var(--gold)', color: 'var(--background)' }}
                    className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity"
                  >
                    {t('common.applyFilters')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <h2
                style={{ color: 'var(--text-primary)' }}
                className="text-[18px] font-semibold leading-none"
              >
                {t('accounts.title')}
                {activeFilterCount > 0 && (
                  <span style={{ color: 'var(--text-muted)' }} className="ml-2 text-[13px] font-normal">
                    — {t('bookings.filtered')}
                  </span>
                )}
              </h2>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center text-[13px] animate-pulse">
                {t('accounts.loading')}
              </div>
            ) : accounts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center">
                <p style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold mb-1">{t('accounts.noAccounts')}</p>
                <p className="text-[12px]">{t('accounts.noAccountsDesc')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)' }}>
                      {[t('accounts.accountId'), t('accounts.reservation'), t('accounts.totalPrice'), t('accounts.payedPrice'), t('common.status'), t('common.created')].map((h) => (
                        <th
                          key={h}
                          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}
                          className="text-left px-5 py-3 text-[9px] font-semibold tracking-[0.2em] uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account, i) => {
                      const payStatus = getPaymentStatus(account.totalPrice, account.payedPrice);
                      const remaining = account.totalPrice - account.payedPrice;
                      return (
                        <tr
                          key={account.id}
                          style={{ borderBottom: i < accounts.length - 1 ? '1px solid var(--card-border)' : 'none', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => router.push(`/hotel-cms/accounts/${account.id}`)}
                        >
                          <td className="px-5 py-4">
                            <span
                              style={{ color: 'var(--text-primary)',  }}
                              className="text-[1.1rem] font-bold tabular-nums"
                            >
                              #{account.id}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/hotel-cms/bookings/${account.reservationId}`);
                              }}
                              style={{ color: 'var(--gold)' }}
                              className="font-mono text-[11px] hover:underline cursor-pointer"
                            >
                              {account.reservationId.slice(0, 8)}…
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              style={{ color: 'var(--text-primary)',  }}
                              className="font-bold tabular-nums text-[13px]"
                            >
                              {formatCurrency(account.totalPrice, account.currency)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div style={{ color: 'var(--text-secondary)' }} className="text-[13px] tabular-nums">
                              {formatCurrency(account.payedPrice, account.currency)}
                            </div>
                            {remaining > 0 && (
                              <div style={{ color: '#FB7185' }} className="text-[11px] tabular-nums">
                                −{formatCurrency(remaining, account.currency)}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              style={{ color: payStatus.color, background: payStatus.color + '1A' }}
                              className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md"
                            >
                              {payStatus.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: 'var(--text-muted)' }} className="text-[11px] tabular-nums">
                              {new Date(account.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
