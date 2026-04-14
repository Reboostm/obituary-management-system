import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DEFAULT_BAD_WORDS = [
  'spam', 'scam', 'hack', 'viagra', 'casino', 'lottery',
  'congratulations you won', 'click here', 'limited time', 'act now',
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    resendApiKey: '',
    directorEmails: 'justinmhomeloans@gmail.com',
    fromEmail: 'noreply@resend.dev',
    notificationsEnabled: true,
    customBadWords: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Load settings from Firestore (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadSettings();
    }
  }, []);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'systemSettings', 'notifications');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data());
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.resendApiKey.trim()) {
      setMessage('❌ Resend API key is required');
      return;
    }
    if (!settings.directorEmails.trim()) {
      setMessage('❌ At least one director email is required');
      return;
    }

    setSaving(true);
    try {
      const settingsRef = doc(db, 'systemSettings', 'notifications');
      await setDoc(settingsRef, settings, { merge: true });
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setMessage('❌ Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-serif text-white mb-6">Notification Settings</h1>

      <div className="bg-dark-800 border border-gray-700 rounded-xl p-6 space-y-6">
        {/* Resend API Key */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Resend API Key
          </label>
          <p className="text-gray-500 text-xs mb-3">
            Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:text-gold-300">resend.com</a>
          </p>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.resendApiKey}
              onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
              placeholder="re_..."
              className="flex-1 bg-dark-900 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-gold-400"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-gray-400 hover:text-white text-sm px-3 py-2"
            >
              {showApiKey ? '🙈 Hide' : '👁 Show'}
            </button>
          </div>
        </div>

        {/* Director Emails */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Director Emails
          </label>
          <p className="text-gray-500 text-xs mb-3">
            For multiple emails, separate with commas (e.g., email1@example.com, email2@example.com)
          </p>
          <textarea
            value={settings.directorEmails}
            onChange={(e) => setSettings({ ...settings, directorEmails: e.target.value })}
            placeholder="director@example.com"
            className="w-full bg-dark-900 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-gold-400 resize-none"
            rows="3"
          />
        </div>

        {/* From Email Address */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Email &quot;From&quot; Address
          </label>
          <p className="text-gray-500 text-xs mb-3">
            Email address that spam alerts will come from. Use a verified domain (e.g., noreply@yourdomain.com) to send to any email address.
          </p>
          <input
            type="email"
            value={settings.fromEmail}
            onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
            placeholder="noreply@yourdomain.com"
            className="w-full bg-dark-900 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-gold-400"
          />
        </div>

        {/* Enable/Disable Notifications */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
              className="w-4 h-4 rounded accent-gold-500"
            />
            <span className="text-gray-300 text-sm font-medium">
              Enable email notifications for bad/spammy memories
            </span>
          </label>
        </div>

        {/* Custom Bad Words */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Custom Keywords to Flag
          </label>
          <p className="text-gray-500 text-xs mb-3">
            Add keywords to flag as suspicious (comma-separated). Built-in keywords are: {DEFAULT_BAD_WORDS.slice(0, 4).join(', ')}...
          </p>
          <textarea
            value={settings.customBadWords}
            onChange={(e) => setSettings({ ...settings, customBadWords: e.target.value })}
            placeholder="viagra, casino, lottery"
            className="w-full bg-dark-900 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-gold-400 resize-none"
            rows="3"
          />
        </div>

        {/* Status Message */}
        {message && (
          <div className={`text-sm p-3 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-red-900/30 border border-red-700 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {/* Info Box */}
        <div className="bg-dark-900 border border-gray-700 rounded-lg p-4 text-gray-400 text-sm">
          <p className="font-medium text-gray-300 mb-2">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When a new memory is posted, it&apos;s scanned for bad keywords</li>
            <li>If flagged, an email is sent to all listed director emails</li>
            <li>Director can review and delete/hide from the memory wall</li>
            <li>API key is stored securely in Firebase</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
