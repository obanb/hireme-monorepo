'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

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
      <div className="p-8">
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
          Access denied. Admin role required.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-8">User Management</h1>

      {loading ? (
        <p className="text-stone-500 text-sm">Loading users...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">{u.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-stone-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={u.id === currentUser?.id}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none disabled:opacity-50"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="USER">USER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${u.isActive ? 'bg-lime-100 text-lime-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => toggleStatus(u.id, !u.isActive)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          u.isActive
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-lime-50 text-lime-600 hover:bg-lime-100'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
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
  );
}
