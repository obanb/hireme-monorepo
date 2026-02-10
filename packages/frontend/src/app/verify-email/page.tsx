'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `mutation VerifyEmail($token: String!) { verifyEmail(token: $token) { success message } }`,
            variables: { token },
          }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0].message);
        setStatus('success');
        setMessage('Email verified successfully.');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 max-w-md w-full text-center">
        {status === 'loading' && <p className="text-stone-500">Verifying your email...</p>}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-lime-600 text-xl">&#10003;</span>
            </div>
            <p className="text-stone-900 font-semibold mb-2">{message}</p>
            <Link href="/hotel-cms" className="text-stone-500 hover:text-stone-900 text-sm transition-colors">
              Go to dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">&#10007;</span>
            </div>
            <p className="text-stone-900 font-semibold mb-2">{message}</p>
            <Link href="/login" className="text-stone-500 hover:text-stone-900 text-sm transition-colors">
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
