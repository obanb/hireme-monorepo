'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
  reservation: {
    id: string;
    guestName: string | null;
    status: string;
    checkInDate: string | null;
    checkOutDate: string | null;
    originId: string | null;
  } | null;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = parseInt(params.id as string, 10);
  const { t } = useLocale();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query GetAccount($id: Int!) {
              account(id: $id) {
                id
                streamId
                reservationId
                totalPrice
                payedPrice
                currency
                createdAt
                updatedAt
                reservation {
                  id
                  guestName
                  status
                  checkInDate
                  checkOutDate
                  originId
                }
              }
            }
          `,
          variables: { id: accountId },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to fetch account');
      }

      setAccount(result.data?.account ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const formatCurrency = (amount: number, currency: string | null) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: currency || 'EUR' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-lime-100 text-lime-700 border-lime-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
        <HotelSidebar />
        <main className="flex-1 ml-72 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse text-center text-stone-500 dark:text-stone-400 py-12">
              {t('accounts.loading')}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
        <HotelSidebar />
        <main className="flex-1 ml-72 p-8">
          <div className="max-w-3xl mx-auto text-center py-12">
            <div className="text-4xl mb-4">◈</div>
            <p className="text-lg font-bold text-stone-700 dark:text-stone-300">{t('accounts.notFound')}</p>
            <Link
              href="/hotel-cms/accounts"
              className="mt-4 inline-block px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors font-bold"
            >
              {t('accounts.backToAccounts')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const remaining = account.totalPrice - account.payedPrice;
  const paidPercent = account.totalPrice > 0 ? Math.min(100, (account.payedPrice / account.totalPrice) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <div className="mb-6">
            <Link
              href="/hotel-cms/accounts"
              className="text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400 flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('accounts.backToAccounts')}
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Account Header */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 mb-1">
                  {t('accounts.account')} #{account.id}
                </h1>
                <p className="text-stone-500 dark:text-stone-400 font-mono text-xs">{t('accounts.streamId')}: {account.streamId}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-stone-900 dark:text-stone-100">
                  {formatCurrency(account.totalPrice, account.currency)}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">{t('accounts.totalPrice')}</p>
              </div>
            </div>

            {/* Payment Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{t('accounts.paymentProgress')}</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{Math.round(paidPercent)}%</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-3">
                <div
                  className="bg-lime-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-lime-600 dark:text-lime-400 font-bold">
                  {t('accounts.paid')}: {formatCurrency(account.payedPrice, account.currency)}
                </span>
                {remaining > 0 && (
                  <span className="text-red-500 dark:text-red-400 font-bold">
                    {t('accounts.remaining')}: {formatCurrency(remaining, account.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6">
              <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4">{t('accounts.financialDetails')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-stone-500 dark:text-stone-400">{t('accounts.totalPrice')}</label>
                  <p className="text-stone-900 dark:text-stone-100 font-black text-xl">
                    {formatCurrency(account.totalPrice, account.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-stone-500 dark:text-stone-400">{t('accounts.payedPrice')}</label>
                  <p className="text-stone-900 dark:text-stone-100 font-bold text-lg">
                    {formatCurrency(account.payedPrice, account.currency)}
                  </p>
                </div>
                {remaining > 0 && (
                  <div>
                    <label className="text-sm text-stone-500 dark:text-stone-400">{t('accounts.outstanding')}</label>
                    <p className="text-red-600 dark:text-red-400 font-bold text-lg">
                      {formatCurrency(remaining, account.currency)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-stone-500 dark:text-stone-400">{t('bookings.currency')}</label>
                  <p className="text-stone-900 dark:text-stone-100 font-bold">{account.currency || 'EUR'}</p>
                </div>
              </div>
            </div>

            {/* Linked Reservation */}
            <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6">
              <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4">{t('accounts.linkedReservation')}</h2>
              {account.reservation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-bold rounded-xl border-2 ${getStatusColor(account.reservation.status)}`}>
                      {account.reservation.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-stone-500 dark:text-stone-400">{t('bookings.guest')}</label>
                    <p className="text-stone-900 dark:text-stone-100 font-bold">{account.reservation.guestName || '-'}</p>
                  </div>
                  {account.reservation.checkInDate && (
                    <div>
                      <label className="text-sm text-stone-500 dark:text-stone-400">{t('bookings.checkIn')}</label>
                      <p className="text-stone-900 dark:text-stone-100">{account.reservation.checkInDate}</p>
                    </div>
                  )}
                  {account.reservation.checkOutDate && (
                    <div>
                      <label className="text-sm text-stone-500 dark:text-stone-400">{t('bookings.checkOut')}</label>
                      <p className="text-stone-900 dark:text-stone-100">{account.reservation.checkOutDate}</p>
                    </div>
                  )}
                  <Link
                    href={`/hotel-cms/bookings/${account.reservationId}`}
                    className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                  >
                    {t('accounts.viewReservation')} →
                  </Link>
                </div>
              ) : (
                <p className="text-stone-500 dark:text-stone-400">{t('accounts.noReservation')}</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-4">{t('bookingDetail.metadata')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-stone-500 dark:text-stone-400">{t('accounts.accountId')}</label>
                <p className="text-stone-900 dark:text-stone-100 font-bold">#{account.id}</p>
              </div>
              <div>
                <label className="text-stone-500 dark:text-stone-400">{t('common.created')}</label>
                <p className="text-stone-900 dark:text-stone-100">{new Date(account.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-stone-500 dark:text-stone-400">{t('common.updated')}</label>
                <p className="text-stone-900 dark:text-stone-100">{new Date(account.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
