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
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">{t('settings.title')}</h1>
          <p className="text-stone-600 dark:text-stone-300 mb-8">{t('settings.subtitle')}</p>

          {/* Profile Info */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{t('settings.accountInfo')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-700">
                <span className="text-sm text-stone-500 dark:text-stone-400">{t('common.name')}</span>
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{user?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-700">
                <span className="text-sm text-stone-500 dark:text-stone-400">{t('common.email')}</span>
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-700">
                <span className="text-sm text-stone-500 dark:text-stone-400">{t('users.role')}</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-stone-500 dark:text-stone-400">Email verified</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${user?.emailVerified ? 'bg-lime-100 text-lime-700' : 'bg-amber-100 text-amber-700'}`}>
                  {user?.emailVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{t('settings.changePassword')}</h2>

            {message && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-lime-50 text-lime-700 text-sm border border-lime-200">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">{t('settings.currentPassword')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">{t('settings.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
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
