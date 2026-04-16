'use client';
import { useState, useEffect } from 'react';
import { Lead, Niche } from '@/types/lead';
import SearchFilters from '@/components/SearchFilters';
import LeadsList from '@/components/LeadsList';
import DashboardStats from '@/components/DashboardStats';

const NICHES: Niche[] = ['plumber', 'hvac', 'electrician', 'contractor', 'roofing', 'landscaping', 'pest_control', 'cleaning', 'realtor', 'dentist'];

export default function Dashboard() {
  const [county, setCounty] = useState('Tooele');
  const [niches, setNiches] = useState<Niche[]>(['plumber']);
  const [minScore, setMinScore] = useState(60);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
    loadLeads();
  }, [county, niches, minScore]);

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/leads/stats?county=${county}`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        county,
        niche: niches.join(','),
        minScore: minScore.toString(),
      });
      const res = await fetch(`/api/leads/search?${params}`);
      const data = await res.json();
      if (data.success) setLeads(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePushGHL = async () => {
    if (selected.size === 0) { alert('Select leads'); return; }
    setLoading(true);
    try {
      const leadsToSync = leads.filter(l => selected.has(l.id));
      const res = await fetch('/api/ghl/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToSync }),
      });
      const data = await res.json();
      alert(data.success ? `Synced ${data.data.succeeded} to GHL` : `Error: ${data.error}`);
      if (data.success) setSelected(new Set());
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (leads.length === 0) { alert('No leads'); return; }
    const csv = [['Name', 'Email', 'Phone', 'Website', 'Niche', 'Score', 'City'], ...leads.map(l => [
      l.businessName, l.email || '', l.phone || '', l.website || '', l.niche, l.qualityScore, l.location.city
    ])].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${county}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold">Lead Generation Platform</h1>
          <p className="text-sm text-gray-600">Search, enrich, and push qualified leads to GHL</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-4">
        {stats && <DashboardStats stats={stats} />}

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <SearchFilters
            county={county}
            onCountyChange={setCounty}
            niches={NICHES}
            selectedNiches={niches}
            onNichesChange={setNiches}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            loading={loading}
          />
        </div>

        <div className="bg-white rounded-lg shadow mt-6 overflow-hidden">
          <div className="p-6 border-b flex justify-between">
            <h2 className="text-lg font-semibold">Leads ({leads.length})</h2>
            <div className="flex gap-2">
              <button onClick={handleExport} disabled={leads.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                Export CSV
              </button>
              <button onClick={handlePushGHL} disabled={selected.size === 0 || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                Push {selected.size} to GHL
              </button>
            </div>
          </div>

          {leads.length > 0 ? (
            <LeadsList
              leads={leads}
              selectedLeads={selected}
              onSelectLead={(id) => {
                const ns = new Set(selected);
                ns.has(id) ? ns.delete(id) : ns.add(id);
                setSelected(ns);
              }}
              onSelectAll={() => {
                if (selected.size === leads.length) setSelected(new Set());
                else setSelected(new Set(leads.map(l => l.id)));
              }}
              loading={loading}
            />
          ) : (
            <div className="p-6 text-center text-gray-500">
              {loading ? 'Loading...' : 'No leads found. Adjust filters.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
