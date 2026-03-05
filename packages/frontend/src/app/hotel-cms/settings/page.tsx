'use client';

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

export default function SettingsPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation ChangePassword($input: ChangePasswordInput!) { changePassword(input: $input) { success message } }`,
          variables: { input: { currentPassword, newPassword } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main
        className="flex-1 px-8 py-8"
        style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-[600px]">
          {/* Header */}
          <h1
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            className="text-[2.75rem] font-bold tracking-tight mb-1"
          >
            {t('settings.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mb-8">
            {t('settings.subtitle')}
          </p>

          {/* Profile Info */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
            className="rounded-xl p-6 mb-5"
          >
            <h2
              style={{ color: 'var(--text-primary)' }}
              className="text-[18px] font-semibold leading-none mb-5"
            >
              {t('settings.accountInfo')}
            </h2>
            <div className="space-y-0">
              {[
                { label: t('common.name'), value: user?.name },
                { label: t('common.email'), value: user?.email },
                { label: t('users.role'), value: user?.role },
                {
                  label: 'Email verified',
                  value: (
                    <span
                      style={{
                        color: user?.emailVerified ? '#4ADE80' : '#FBBF24',
                        background: user?.emailVerified ? 'rgba(74,222,128,0.10)' : 'rgba(251,191,36,0.10)',
                      }}
                      className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md"
                    >
                      {user?.emailVerified ? 'Verified' : 'Not verified'}
                    </span>
                  ),
                },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{ borderBottom: i < 3 ? '1px solid var(--card-border)' : 'none' }}
                  className="flex items-center justify-between py-3"
                >
                  <span style={{ color: 'var(--text-muted)' }} className="text-[12px]">
                    {row.label}
                  </span>
                  {typeof row.value === 'string' ? (
                    <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">
                      {row.value}
                    </span>
                  ) : (
                    row.value
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
            className="rounded-xl p-6"
          >
            <h2
              style={{ color: 'var(--text-primary)' }}
              className="text-[18px] font-semibold leading-none mb-5"
            >
              {t('settings.changePassword')}
            </h2>

            {message && (
              <div
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)', color: '#4ADE80' }}
                className="px-4 py-3 rounded-md text-[13px] mb-4"
              >
                {message}
              </div>
            )}
            {error && (
              <div
                style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }}
                className="px-4 py-3 rounded-md text-[13px] mb-4"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-1.5">
                  {t('settings.currentPassword')}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold tracking-[0.08em] uppercase mb-1.5">
                  {t('settings.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ background: 'var(--gold)', color: 'var(--background)' }}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? t('settings.changing') : t('settings.updatePassword')}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
