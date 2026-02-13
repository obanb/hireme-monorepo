'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/hotel-cms';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 dark:bg-stone-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-lime-400 font-black text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">HIREME</h1>
          <p className="text-stone-400 text-sm mt-1">{t('nav.hotelCms')}</p>
        </div>

        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 border border-stone-200 dark:border-stone-700 p-8">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6">{t('auth.signIn')}</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">{t('auth.emailAddress')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                placeholder="admin@hireme.dev"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-stone-900 text-white font-semibold text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              {t('auth.forgotPasswordLink')}
            </Link>
            <Link href="/register" className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
