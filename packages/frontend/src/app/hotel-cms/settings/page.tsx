'use client';

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

export default function SettingsPage() {
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
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-8">Account Settings</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Profile</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-stone-100">
            <span className="text-sm text-stone-500">Name</span>
            <span className="text-sm font-medium text-stone-900">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-stone-100">
            <span className="text-sm text-stone-500">Email</span>
            <span className="text-sm font-medium text-stone-900">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-stone-100">
            <span className="text-sm text-stone-500">Role</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700">{user?.role}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-stone-500">Email verified</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${user?.emailVerified ? 'bg-lime-100 text-lime-700' : 'bg-amber-100 text-amber-700'}`}>
              {user?.emailVerified ? 'Verified' : 'Not verified'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Change Password</h2>

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
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
}
