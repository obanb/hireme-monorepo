'use client';

import { useState } from 'react';
import Link from 'next/link';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation RequestPasswordReset($input: RequestPasswordResetInput!) { requestPasswordReset(input: $input) { success message } }`,
          variables: { input: { email } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-lime-400 font-black text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">HIREME</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 p-8">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Reset password</h2>
          <p className="text-stone-500 text-sm mb-6">Enter your email to receive a reset link.</p>

          {sent ? (
            <div className="px-4 py-3 rounded-xl bg-lime-50 text-lime-700 text-sm border border-lime-200">
              If the email exists, a reset link has been sent. Check your inbox.
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-stone-900 text-white font-semibold text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-stone-500 hover:text-stone-900 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
