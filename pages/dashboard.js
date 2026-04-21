import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ObituaryForm from '../components/ObituaryForm';
import ObituaryPreview from '../components/ObituaryPreview';
import ObituaryList from '../components/ObituaryList';
import MemoryWall from '../components/MemoryWall';
import NotificationSettings from '../components/NotificationSettings';
import FloralShopsManager from '../components/FloralShopsManager';
import { getObituaries, deleteObituary } from '../lib/obituaries';

const STATUS_COUNTS = (obituaries) => ({
  total: obituaries.length,
  published: obituaries.filter((o) => o.status === 'published').length,
  draft: obituaries.filter((o) => o.status === 'draft').length,
});

export default function Dashboard() {
  const router = useRouter();
  const [obituaries, setObituaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'form' | 'preview' | 'memories' | 'settings' | 'floralShops'
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [memoriesObit, setMemoriesObit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewHistory, setViewHistory] = useState(['list']); // Track view history for back button
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality

  // Auth guard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('oms_auth');
      if (auth !== 'true') {
        router.replace('/');
      } else {
        fetchObituaries();
        // Push initial state to browser history
        window.history.replaceState({ view: 'list' }, '', window.location.href);
      }
    }
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      const state = e.state || { view: 'list' };
      setView(state.view || 'list');
      setEditing(null);
      setPreviewing(null);
      setMemoriesObit(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchObituaries = async () => {
    try {
      setLoading(true);
      const data = await getObituaries();
      setObituaries(data);
    } catch (err) {
      console.error('Failed to load obituaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('oms_auth');
    router.push('/');
  };

  const pushViewState = (newView) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: newView }, '', window.location.href);
    }
  };

  const handleNew = () => {
    setEditing(null);
    setView('form');
    pushViewState('form');
  };

  const handleEdit = (obit) => {
    setEditing(obit);
    setView('form');
    pushViewState('form');
  };

  const handlePreview = (obit) => {
    setPreviewing(obit);
    setView('preview');
    pushViewState('preview');
  };

  const handleMemories = (obit) => {
    setMemoriesObit(obit);
    setView('memories');
    pushViewState('memories');
  };

  const handleFormSave = async () => {
    await fetchObituaries();
    goToList(); // Navigate back to list after save (embed codes are shown inside the form first)
  };

  const goToList = () => {
    setView('list');
    setEditing(null);
    setPreviewing(null);
    setMemoriesObit(null);
    pushViewState('list');
  };

  const handleDelete = async (id) => {
    try {
      await deleteObituary(id);
      setDeleteConfirm(null);
      await fetchObituaries();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const counts = STATUS_COUNTS(obituaries);

  // Filter obituaries based on search query
  const filteredObituaries = obituaries.filter((obit) =>
    obit.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Dashboard — ReBoost Marketing Obituary System</title>
      </Head>

      <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,127,0.07) 0%, #080808 55%)' }}>
        {/* Top Nav */}
        <nav className="sticky top-0 z-40 px-6 py-4"
          style={{ background: 'rgba(10,10,10,0.97)', borderBottom: '1px solid rgba(212,175,127,0.15)', backdropFilter: 'blur(8px)' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4af7f' }} />
              <div>
                <div className="text-gold-400 text-xs font-bold uppercase tracking-widest leading-tight">ReBoost Marketing</div>
                <div className="text-gray-500 text-xs leading-snug">Obituary Management System</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {view !== 'list' && (
                <button
                  onClick={goToList}
                  className="text-gray-400 hover:text-white text-sm transition flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Dashboard
                </button>
              )}
              <button
                onClick={() => { setView('floralShops'); pushViewState('floralShops'); }}
                className="text-gray-400 hover:text-gold-400 text-sm transition flex items-center gap-1"
                title="Manage Floral Shops"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Floral Shops
              </button>
              <button
                onClick={() => { setView('settings'); pushViewState('settings'); }}
                className="text-gray-400 hover:text-gold-400 text-sm transition flex items-center gap-1"
                title="Notification & Email Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 text-sm transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">

          {/* ── LIST VIEW ──────────────────────────────────────────────── */}
          {view === 'list' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-serif text-white">Obituaries</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {obituaries.length} total record{obituaries.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={handleNew}
                  className="bg-gold-500 hover:bg-gold-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Obituary
                </button>
              </div>

              {/* Gold divider */}
              <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, rgba(212,175,127,0.6), transparent)' }} />

              {/* Search Bar */}
              <div className="mb-6 relative">
                <input
                  type="text"
                  placeholder="Search obituaries by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-white px-4 py-3 rounded-xl text-sm focus:outline-none transition"
                  style={{ background: 'rgba(18,18,18,0.8)', border: '1px solid rgba(212,175,127,0.15)' }}
                  onFocus={e => e.target.style.borderColor='rgba(212,175,127,0.45)'}
                  onBlur={e => e.target.style.borderColor='rgba(212,175,127,0.15)'}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
                    title="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Records', value: counts.total, color: 'text-white', accent: 'rgba(212,175,127,0.15)' },
                  { label: 'Published', value: counts.published, color: 'text-green-400', accent: 'rgba(52,211,153,0.08)' },
                  { label: 'Draft', value: counts.draft, color: 'text-yellow-400', accent: 'rgba(251,191,36,0.08)' },
                ].map(({ label, value, color, accent }) => (
                  <div key={label} className="rounded-xl px-5 py-5"
                    style={{ background: accent, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">{label}</p>
                    <p className={`text-4xl font-light ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Search Results Info */}
              {searchQuery && (
                <p className="text-gray-400 text-sm mb-4">
                  Showing {filteredObituaries.length} of {obituaries.length} record{obituaries.length !== 1 ? 's' : ''}
                </p>
              )}

              <ObituaryList
                obituaries={filteredObituaries}
                loading={loading}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onMemories={handleMemories}
                onDelete={(id) => setDeleteConfirm(id)}
                onNew={handleNew}
              />
            </>
          )}

          {/* ── FORM VIEW ─────────────────────────────────────────────── */}
          {view === 'form' && (
            <ObituaryForm
              initial={editing}
              onSave={handleFormSave}
              onCancel={goToList}
            />
          )}

          {/* ── PREVIEW VIEW ──────────────────────────────────────────── */}
          {view === 'preview' && previewing && (
            <ObituaryPreview
              obituary={previewing}
              onEdit={() => { setEditing(previewing); setView('form'); }}
              onBack={goToList}
            />
          )}

          {/* ── MEMORIES VIEW ─────────────────────────────────────────── */}
          {view === 'memories' && memoriesObit && (
            <div>
              {/* Obit summary card */}
              <div className="bg-dark-800 border border-gray-700 rounded-xl p-5 mb-8 flex items-start gap-4">
                {memoriesObit.images?.[0] ? (
                  <img
                    src={memoriesObit.images[0]}
                    alt={memoriesObit.fullName}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-600 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-dark-900 border border-gray-700 flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-medium text-lg">{memoriesObit.fullName}</h2>
                  {memoriesObit.birthDate && memoriesObit.deathDate && (
                    <p className="text-gray-400 text-sm">{memoriesObit.birthDate} — {memoriesObit.deathDate}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => { setEditing(memoriesObit); setView('form'); }}
                      className="text-gold-400 hover:text-gold-300 text-xs transition"
                    >
                      Edit obituary
                    </button>
                    <span className="text-gray-700">·</span>
                    <button
                      onClick={() => { setPreviewing(memoriesObit); setView('preview'); }}
                      className="text-gray-400 hover:text-white text-xs transition"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>

              <MemoryWall obituaryId={memoriesObit.id} obituaryName={memoriesObit.fullName} />
            </div>
          )}

          {/* ── FLORAL SHOPS VIEW ─────────────────────────────────────────── */}
          {view === 'floralShops' && (
            <FloralShopsManager />
          )}

          {/* ── SETTINGS VIEW ─────────────────────────────────────────── */}
          {view === 'settings' && (
            <NotificationSettings />
          )}
        </main>

        {/* Delete Confirm Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
            <div className="bg-dark-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-white font-medium text-lg mb-2">Delete Obituary</h3>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone. The obituary and all associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
