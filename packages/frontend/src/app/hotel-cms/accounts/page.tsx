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
                id
                streamId
                reservationId
                totalPrice
                payedPrice
                currency
                createdAt
                updatedAt
              }
            }
          `,
          variables: { filter: filterInput },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to fetch accounts');
      }

      setAccounts(result.data?.accounts ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, buildFilterInput]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
    if (payed >= total) return { label: t('accounts.paid'), color: 'bg-lime-100 text-lime-700' };
    if (payed > 0) return { label: t('accounts.partial'), color: 'bg-amber-100 text-amber-700' };
    return { label: t('accounts.unpaid'), color: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">{t('accounts.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400">{t('accounts.subtitle')}</p>
            </div>
            <button
              onClick={() => fetchAccounts()}
              disabled={loading}
              className="px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-all duration-200 flex items-center gap-2"
            >
              <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
              {t('common.refresh')}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
              {error}
              <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                {t('common.dismiss')}
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl text-lime-600">&#x25CE;</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{t('common.filters')}</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-lime-100 text-lime-700 text-xs font-bold rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <span className="text-stone-400 dark:text-stone-500">{showFilters ? '▲' : '▼'}</span>
            </button>

            {showFilters && (
              <div className="p-6 border-t border-stone-200 dark:border-stone-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('accounts.reservationId')}
                    </label>
                    <input
                      type="text"
                      value={filters.reservationId}
                      onChange={(e) => setFilters({ ...filters, reservationId: e.target.value })}
                      placeholder="UUID..."
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('accounts.minTotal')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minTotal}
                      onChange={(e) => setFilters({ ...filters, minTotal: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('accounts.maxTotal')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxTotal}
                      onChange={(e) => setFilters({ ...filters, maxTotal: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.createdFrom')}
                    </label>
                    <input
                      type="date"
                      value={filters.createdFrom}
                      onChange={(e) => setFilters({ ...filters, createdFrom: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.createdTo')}
                    </label>
                    <input
                      type="date"
                      value={filters.createdTo}
                      onChange={(e) => setFilters({ ...filters, createdTo: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100 dark:border-stone-700">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors font-medium"
                  >
                    {t('common.clearAll')}
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                  >
                    {t('common.applyFilters')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Table */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
                {t('accounts.title')}
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-stone-500 dark:text-stone-400">
                    {t('bookings.filtered')}
                  </span>
                )}
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="animate-pulse">{t('accounts.loading')}</div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="text-4xl mb-4">◈</div>
                <p className="text-lg font-bold">{t('accounts.noAccounts')}</p>
                <p className="text-sm mt-1">{t('accounts.noAccountsDesc')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 dark:bg-stone-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('accounts.accountId')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('accounts.reservation')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('accounts.totalPrice')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('accounts.payedPrice')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('common.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('common.created')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {accounts.map((account) => {
                      const payStatus = getPaymentStatus(account.totalPrice, account.payedPrice);
                      const remaining = account.totalPrice - account.payedPrice;
                      return (
                        <tr
                          key={account.id}
                          className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          onClick={() => router.push(`/hotel-cms/accounts/${account.id}`)}
                        >
                          <td className="px-6 py-4">
                            <span className="font-black text-stone-900 dark:text-stone-100 text-lg">#{account.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/hotel-cms/bookings/${account.reservationId}`);
                              }}
                              className="text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400 font-mono text-xs hover:underline"
                            >
                              {account.reservationId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-stone-900 dark:text-stone-100">
                            {formatCurrency(account.totalPrice, account.currency)}
                          </td>
                          <td className="px-6 py-4 text-stone-700 dark:text-stone-300">
                            <div>{formatCurrency(account.payedPrice, account.currency)}</div>
                            {remaining > 0 && (
                              <div className="text-xs text-red-500 dark:text-red-400">
                                -{formatCurrency(remaining, account.currency)} {t('accounts.remaining')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-lg ${payStatus.color}`}>
                              {payStatus.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-stone-500 dark:text-stone-400 text-sm">
                            {new Date(account.createdAt).toLocaleDateString()}
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
