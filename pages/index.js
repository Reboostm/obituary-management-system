import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const ADMIN_PASSWORD = 'reboost2024';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('oms_auth', 'true');
        router.push('/dashboard');
      } else {
        setError('Incorrect password. Please try again.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <>
      <Head>
        <title>ReBoost Marketing — Obituary Management System</title>
      </Head>
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,127,0.08) 0%, #080808 60%)' }}>
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            {/* Gold divider accent */}
            <div className="flex items-center justify-center mb-5">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #d4af7f)' }} />
              <div className="w-2 h-2 rounded-full mx-3" style={{ background: '#d4af7f' }} />
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #d4af7f, transparent)' }} />
            </div>
            <h1 className="font-bold uppercase tracking-widest mb-1" style={{ fontSize: '2.2rem', color: '#d4af7f', letterSpacing: '0.12em' }}>ReBoost Marketing</h1>
            <p className="text-gray-300 font-serif text-lg tracking-wide mb-1">Obituary Management</p>
            <p className="text-gray-500 text-sm">Admin Portal</p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl p-8 shadow-2xl"
            style={{
              background: 'rgba(18,18,18,0.95)',
              border: '1px solid rgba(212,175,127,0.25)',
              boxShadow: '0 0 40px rgba(212,175,127,0.06), 0 25px 50px rgba(0,0,0,0.5)'
            }}>

            {/* Gold top accent line */}
            <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, transparent, #d4af7f, transparent)' }} />

            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-6 text-center">Director Sign In</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2" htmlFor="password">
                  Admin Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full text-white rounded-xl px-4 py-3 text-sm
                             focus:outline-none focus:ring-1 focus:ring-gold-500
                             placeholder-gray-600 transition"
                  style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-800 border-opacity-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full disabled:opacity-60 disabled:cursor-not-allowed
                           text-white font-medium py-3 rounded-xl transition text-sm tracking-widest uppercase"
                style={{ background: 'linear-gradient(135deg, #c9a96e, #d4af7f, #b8934a)' }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="h-px mt-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,127,0.2), transparent)' }} />
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-gray-700 text-xs">
              © {new Date().getFullYear()} ReBoost Marketing · Obituary Management System
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
