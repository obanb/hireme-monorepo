'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { t } = useLocale();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query Users { users { id email name role isActive emailVerified createdAt } }`,
        }),
      });
      const json = await res.json();
      if (json.data?.users) setUsers(json.data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateRole = async (userId: string, role: string) => {
    try {
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation UpdateUserRole($input: UpdateUserRoleInput!) { updateUserRole(input: $input) { id role } }`,
          variables: { input: { userId, role } },
        }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const toggleStatus = async (userId: string, isActive: boolean) => {
    try {
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation UpdateUserStatus($input: UpdateUserStatusInput!) { updateUserStatus(input: $input) { id isActive } }`,
          variables: { input: { userId, isActive } },
        }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main
          className="flex-1 px-8 py-8"
          style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <div
            style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }}
            className="px-4 py-3 rounded-md text-[13px]"
          >
            Access denied. Admin role required.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main
        className="flex-1 px-8 py-8"
        style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-[1380px] mx-auto">
          <h1
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            className="text-[2.75rem] font-bold tracking-tight mb-1"
          >
            {t('users.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mb-8">
            {t('users.subtitle')}
          </p>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }} className="text-[13px] animate-pulse">{t('common.loading')}</p>
          ) : users.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('users.noUsers')}</p>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--surface-hover)' }}>
                    {[t('common.name'), t('common.email'), t('users.role'), t('common.status'), t('common.actions')].map((h) => (
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
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{ borderBottom: i < users.length - 1 ? '1px solid var(--card-border)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
                          >
                            <span style={{  }} className="font-bold text-[12px]">
                              {u.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span style={{ color: 'var(--text-secondary)' }} className="text-[13px]">{u.email}</span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          disabled={u.id === currentUser?.id}
                          className="text-[11px] font-medium px-2.5 py-1.5 rounded-md outline-none focus:ring-1 focus:ring-[#C9A96E] disabled:opacity-50"
                          style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="USER">USER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          style={{
                            color: u.isActive ? '#4ADE80' : '#FB7185',
                            background: u.isActive ? 'rgba(74,222,128,0.10)' : 'rgba(251,113,133,0.10)',
                          }}
                          className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md"
                        >
                          {u.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => toggleStatus(u.id, !u.isActive)}
                            style={{
                              color: u.isActive ? '#FB7185' : '#4ADE80',
                              background: u.isActive ? 'rgba(251,113,133,0.10)' : 'rgba(74,222,128,0.10)',
                            }}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity"
                          >
                            {u.isActive ? t('common.deactivate') : t('users.activateUser')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
