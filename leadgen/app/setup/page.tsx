'use client';
import { useState } from 'react';

export default function Setup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const importData = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/sample-leads.json');
      const data = await res.json();
      const r = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      setStatus(result.success ? 'success' : 'error');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
          <h1 className="text-3xl font-bold text-white">Setup Guide</h1>
          <p className="text-blue-100 mt-2">Complete these steps to get started</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="pb-8 border-b">
            <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-4">1</div>
              <h2 className="text-xl font-semibold">Configure Firebase</h2></div>
            <div className="ml-14 space-y-2 text-gray-600">
              <p>1. Go to <a href="https://console.firebase.google.com" target="_blank" className="text-blue-600">Firebase Console</a></p>
              <p>2. Create project and enable Firestore</p>
              <p>3. Copy credentials to <code className="bg-gray-100 px-2 py-1">.env.local</code></p>
            </div>
          </div>

          <div className="pb-8 border-b">
            <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-4">2</div>
              <h2 className="text-xl font-semibold">Add API Keys</h2></div>
            <div className="ml-14 space-y-2 text-gray-600">
              <p><a href="https://hunter.io/pricing" target="_blank" className="text-blue-600">Hunter.io</a> - Email finding</p>
              <p><a href="https://clearbit.com/pricing" target="_blank" className="text-blue-600">Clearbit</a> - Company data</p>
              <p className="bg-yellow-50 p-3 rounded">Add to <code>.env.local</code></p>
            </div>
          </div>

          <div className="pb-8 border-b">
            <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-4">3</div>
              <h2 className="text-xl font-semibold">Configure GoHighLevel</h2></div>
            <div className="ml-14 space-y-2 text-gray-600">
              <p>1. Sign up at <a href="https://gohighlevel.com" target="_blank" className="text-blue-600">GoHighLevel</a></p>
              <p>2. Get API key from Account Settings</p>
              <p>3. Add to <code>.env.local</code></p>
            </div>
          </div>

          <div>
            <div className="flex items-center mb-4"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-4">4</div>
              <h2 className="text-xl font-semibold">Load Sample Data</h2></div>
            <div className="ml-14">
              {status === 'success' && <div className="bg-green-50 border border-green-200 p-4 rounded text-green-800">✓ Data imported! Go to <a href="/" className="underline font-bold">Dashboard</a></div>}
              {status === 'error' && <div className="bg-red-50 border border-red-200 p-4 rounded text-red-800">✗ Failed. Check console.</div>}
              <button onClick={importData} disabled={status === 'loading'} className="mt-4 w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                {status === 'loading' ? 'Importing...' : 'Import 5 Sample Leads'}
              </button>
            </div>
          </div>

          <a href="/" className="block text-center mt-8 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
