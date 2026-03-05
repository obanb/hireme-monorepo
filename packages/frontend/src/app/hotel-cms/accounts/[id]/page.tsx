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

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#4ADE80',
  PENDING: '#FBBF24',
  CANCELLED: '#FB7185',
};

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
        {label}
      </p>
      {typeof value === 'string' ? (
        <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">
          {value}
        </p>
      ) : (
        value
      )}
    </div>
  );
}

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
                id streamId reservationId totalPrice payedPrice currency createdAt updatedAt
                reservation { id guestName status checkInDate checkOutDate originId }
              }
            }
          `,
          variables: { id: accountId },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to fetch account');
      setAccount(result.data?.account ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const formatCurrency = (amount: number, currency: string | null) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: currency || 'EUR' });

  const mainStyle = {
    marginLeft: 'var(--sidebar-width, 280px)',
    transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
  };

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main className="flex-1 px-8 py-8" style={mainStyle}>
          <div style={{ color: 'var(--text-muted)' }} className="text-center py-16 text-[13px] animate-pulse">
            {t('accounts.loading')}
          </div>
        </main>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main className="flex-1 px-8 py-8" style={mainStyle}>
          <div className="max-w-[720px] mx-auto text-center py-16">
            <p style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold mb-4">{t('accounts.notFound')}</p>
            <Link
              href="/hotel-cms/accounts"
              style={{ background: 'var(--gold)', color: 'var(--background)' }}
              className="inline-block px-4 py-2 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity"
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
  const resStatusColor = STATUS_COLORS[account.reservation?.status ?? ''] ?? '#C9A96E';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-[720px] mx-auto">
          {/* Back */}
          <Link
            href="/hotel-cms/accounts"
            style={{ color: 'var(--text-muted)' }}
            className="flex items-center gap-2 text-[12.5px] font-medium mb-6 w-fit"
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          >
            <ArrowLeftIcon />
            {t('accounts.backToAccounts')}
          </Link>

          {error && (
            <div
              style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }}
              className="px-4 py-3 rounded-md text-[13px] mb-5"
            >
              {error}
            </div>
          )}

          {/* Account Header */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
            className="rounded-xl p-6 mb-5"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1
                  style={{ color: 'var(--text-primary)' }}
                  className="text-[2.2rem] font-bold tracking-tight mb-1"
                >
                  {t('accounts.account')} #{account.id}
                </h1>
                <p style={{ color: 'var(--text-muted)' }} className="font-mono text-[11px]">
                  {t('accounts.streamId')}: {account.streamId}
                </p>
              </div>
              <div className="text-right">
                <p
                  style={{ color: 'var(--text-primary)',  }}
                  className="text-[1.75rem] font-bold tabular-nums"
                >
                  {formatCurrency(account.totalPrice, account.currency)}
                </p>
                <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('accounts.totalPrice')}</p>
              </div>
            </div>

            {/* Payment Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('accounts.paymentProgress')}</span>
                <span style={{ color: 'var(--text-primary)',  }} className="text-[12px] font-semibold tabular-nums">
                  {Math.round(paidPercent)}%
                </span>
              </div>
              <div style={{ background: 'var(--surface-hover)' }} className="w-full rounded-full h-2">
                <div
                  style={{ width: `${paidPercent}%`, background: 'var(--gold)' }}
                  className="h-2 rounded-full transition-all duration-500"
                />
              </div>
              <div className="flex justify-between mt-2 text-[12px] tabular-nums">
                <span style={{ color: '#4ADE80' }} className="font-semibold">
                  {t('accounts.paid')}: {formatCurrency(account.payedPrice, account.currency)}
                </span>
                {remaining > 0 && (
                  <span style={{ color: '#FB7185' }} className="font-semibold">
                    {t('accounts.remaining')}: {formatCurrency(remaining, account.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Financial Details */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
              <h2
                style={{ color: 'var(--text-primary)' }}
                className="text-[18px] font-semibold leading-none mb-5"
              >
                {t('accounts.financialDetails')}
              </h2>
              <div className="space-y-4">
                <DetailRow
                  label={t('accounts.totalPrice')}
                  value={
                    <p style={{ color: 'var(--text-primary)',  }} className="text-[1.4rem] font-bold tabular-nums">
                      {formatCurrency(account.totalPrice, account.currency)}
                    </p>
                  }
                />
                <DetailRow
                  label={t('accounts.payedPrice')}
                  value={
                    <p style={{ color: 'var(--text-primary)',  }} className="text-[1.1rem] font-bold tabular-nums">
                      {formatCurrency(account.payedPrice, account.currency)}
                    </p>
                  }
                />
                {remaining > 0 && (
                  <DetailRow
                    label={t('accounts.outstanding')}
                    value={
                      <p style={{ color: '#FB7185',  }} className="text-[1.1rem] font-bold tabular-nums">
                        {formatCurrency(remaining, account.currency)}
                      </p>
                    }
                  />
                )}
                <DetailRow label={t('bookings.currency')} value={account.currency || 'EUR'} />
              </div>
            </div>

            {/* Linked Reservation */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
              <h2
                style={{ color: 'var(--text-primary)' }}
                className="text-[18px] font-semibold leading-none mb-5"
              >
                {t('accounts.linkedReservation')}
              </h2>
              {account.reservation ? (
                <div className="space-y-4">
                  <div>
                    <span
                      style={{ color: resStatusColor, background: resStatusColor + '1A' }}
                      className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md"
                    >
                      {account.reservation.status}
                    </span>
                  </div>
                  <DetailRow label={t('bookings.guest')} value={account.reservation.guestName || '-'} />
                  {account.reservation.checkInDate && (
                    <DetailRow label={t('bookings.checkIn')} value={account.reservation.checkInDate} />
                  )}
                  {account.reservation.checkOutDate && (
                    <DetailRow label={t('bookings.checkOut')} value={account.reservation.checkOutDate} />
                  )}
                  <Link
                    href={`/hotel-cms/bookings/${account.reservationId}`}
                    style={{ background: 'var(--gold)', color: 'var(--background)' }}
                    className="mt-2 inline-flex items-center gap-1 px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity"
                  >
                    {t('accounts.viewReservation')} →
                  </Link>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('accounts.noReservation')}</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
            <h2
              style={{ color: 'var(--text-primary)' }}
              className="text-[18px] font-semibold leading-none mb-5"
            >
              {t('bookingDetail.metadata')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <DetailRow label={t('accounts.accountId')} value={`#${account.id}`} />
              <DetailRow label={t('common.created')} value={new Date(account.createdAt).toLocaleString()} />
              <DetailRow label={t('common.updated')} value={new Date(account.updatedAt).toLocaleString()} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
