import { useState, useEffect } from 'react';
import { addObituary, updateObituary } from '../lib/obituaries';
import ImageUploader from './ImageUploader';
import ServiceFields from './ServiceFields';
import FloralShopSelector from './FloralShopSelector';
import EmbedCodes from './EmbedCodes';

const EMPTY_SERVICE = { date: '', time: '', type: 'Funeral Service', location: '', virtualLink: '' };

const EMPTY_FORM = {
  fullName: '',
  birthDate: '',
  deathDate: '',
  location: '',
  bio: '',
  survivors: '',
  predeceased: '',
  services: [{ ...EMPTY_SERVICE }],
  images: [],
  status: 'draft',
  url: '', // Will be auto-generated from fullName
  selectedFloralShopId: null, // For flower order fulfillment
};

// Helper: Convert name to URL slug
const slugifyName = (fullName) => {
  if (!fullName) return '';
  return fullName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/[^\w\-]/g, '') // remove special chars
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens
};

const BASE_URL = 'https://didericksenmemorialfuneralservices.com/obituaries-';

export default function ObituaryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial
      ? {
          fullName: initial.fullName || '',
          birthDate: initial.birthDate || '',
          deathDate: initial.deathDate || '',
          location: initial.location || '',
          bio: initial.bio || '',
          survivors: initial.survivors || '',
          predeceased: initial.predeceased || '',
          services: initial.services?.length ? initial.services : [{ ...EMPTY_SERVICE }],
          images: initial.images || [],
          status: initial.status || 'draft',
          url: initial.url || `${BASE_URL}${slugifyName(initial.fullName)}`,
          selectedFloralShopId: initial.selectedFloralShopId || null,
        }
      : { ...EMPTY_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedObituary, setSavedObituary] = useState(null); // shows embed codes after save

  // Auto-generate URL from fullName (only if creating new, not editing)
  useEffect(() => {
    if (!initial && form.fullName.trim()) {
      const newUrl = `${BASE_URL}${slugifyName(form.fullName)}`;
      setForm((prev) => ({ ...prev, url: newUrl }));
    }
  }, [form.fullName, initial]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (initial?.id) {
        await updateObituary(initial.id, form);
        setSavedObituary({ ...form, id: initial.id });
      } else {
        const newId = await addObituary(form);
        setSavedObituary({ ...form, id: newId });
      }
    } catch (err) {
      console.error(err);
      const reason = err?.code || err?.message || String(err);
      setError(`Save failed: ${reason}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Post-save state: show embed codes ─────────────────────────────────────
  if (savedObituary) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-serif text-white">
            {initial ? 'Changes Saved' : 'Obituary Created'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {savedObituary.fullName} · Status:{' '}
            <span className={`font-medium ${savedObituary.status === 'published' ? 'text-green-400' : 'text-yellow-400'}`}>
              {savedObituary.status.charAt(0).toUpperCase() + savedObituary.status.slice(1)}
            </span>
          </p>
        </div>

        <EmbedCodes obituary={savedObituary} />

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => { setSavedObituary(null); }}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
          >
            ← Continue Editing
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-medium transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-white">
          {initial ? 'Edit Obituary' : 'New Obituary'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {initial
            ? `Editing record for ${initial.fullName}`
            : 'Fill in the details below to create a new obituary record.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-2">Photos</h2>
          <p className="text-gray-500 text-xs mb-4">
            Upload up to 5 photos. The first image will be used as the primary photo across all embeds. Hover a thumbnail to reorder or remove.
          </p>
          <ImageUploader
            images={form.images}
            onChange={(urls) => setForm((prev) => ({ ...prev, images: urls }))}
            maxImages={5}
            folder="obituaries"
          />
        </section>

        {/* Personal Details */}
        <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-5">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Field label="Full Name *" id="fullName">
                <input
                  id="fullName" type="text" value={form.fullName} onChange={set('fullName')}
                  placeholder="e.g. Margaret Anne Johnson" className={inputClass}
                />
              </Field>
            </div>
            <Field label="Date of Birth" id="birthDate">
              <input id="birthDate" type="text" value={form.birthDate} onChange={set('birthDate')}
                placeholder="e.g. January 15, 1942" className={inputClass} />
            </Field>
            <Field label="Date of Passing" id="deathDate">
              <input id="deathDate" type="text" value={form.deathDate} onChange={set('deathDate')}
                placeholder="e.g. March 22, 2024" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Hometown / Location" id="location">
                <input id="location" type="text" value={form.location} onChange={set('location')}
                  placeholder="e.g. Tooele, Utah" className={inputClass} />
              </Field>
            </div>
          </div>
        </section>

        {/* Biography */}
        <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-5">Biography</h2>
          <Field label="Life Story & Biography" id="bio">
            <textarea
              id="bio" value={form.bio} onChange={set('bio')} rows={8}
              placeholder="Write a meaningful tribute that captures the essence of their life, achievements, passions, and the legacy they leave behind…"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </section>

        {/* Family */}
        <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-5">Family</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Survived By" id="survivors">
              <textarea
                id="survivors" value={form.survivors} onChange={set('survivors')} rows={4}
                placeholder="e.g. Spouse Jane; children Robert and Emily; four grandchildren…"
                className={`${inputClass} resize-y`}
              />
            </Field>
            <Field label="Preceded in Death By" id="predeceased">
              <textarea
                id="predeceased" value={form.predeceased} onChange={set('predeceased')} rows={4}
                placeholder="e.g. Parents Harold and Dorothy; brother William…"
                className={`${inputClass} resize-y`}
              />
            </Field>
          </div>
        </section>

        {/* Services */}
        <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-1">Memorial Services</h2>
          <p className="text-gray-500 text-xs mb-5">Add up to 5 service entries. Each service appears separately on the preview and all embed codes.</p>
          <ServiceFields
            services={form.services}
            onChange={(services) => setForm((prev) => ({ ...prev, services }))}
          />
        </section>

        {/* Floral Shop Selection */}
        <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-5">Flower Order Fulfillment</h2>
          <FloralShopSelector
            selectedShopId={form.selectedFloralShopId}
            onChange={(shopId) => setForm((prev) => ({ ...prev, selectedFloralShopId: shopId }))}
          />
        </section>

        {/* Full Obituary URL & Sharing */}
        {form.url && (
          <section className="bg-dark-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gold-400 uppercase tracking-widest mb-4">Full Obituary Page</h2>
            <p className="text-gray-500 text-xs mb-3">Share this link to the full obituary page:</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={form.url}
                  readOnly
                  className="flex-1 bg-dark-900 border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(form.url);
                    alert('Link copied to clipboard!');
                  }}
                  className="px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs mb-3">Share on social media:</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Facebook', icon: '📘', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(form.url)}` },
                  { name: 'Twitter', icon: '𝕏', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(form.url)}&text=${encodeURIComponent(`Read the obituary of ${form.fullName}`)}` },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-white rounded-lg transition"
                  >
                    {social.icon} {social.name}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Status & Submit */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Status:</label>
            <select
              value={form.status}
              onChange={set('status')}
              className="bg-dark-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            {form.status === 'published' && (
              <span className="text-xs text-green-400">Visible on your website via embed codes</span>
            )}
            {form.status === 'archived' && (
              <span className="text-xs text-gray-500">Hidden from all embeds</span>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-800 rounded-lg px-3 py-2 flex-1">
              {error}
            </p>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <button type="button" onClick={onCancel}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Obituary'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-dark-900 border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent ' +
  'placeholder-gray-600 transition';
