import { useState, useEffect } from 'react';
import { getFloralShops, createFloralShop, updateFloralShop, deleteFloralShop } from '../lib/floralShops';

const inputClass = 'w-full bg-dark-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder-gray-600 transition';

export default function FloralShopsManager() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const data = await getFloralShops();
      setShops(data);
    } catch (err) {
      setError('Failed to load floral shops');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', phone: '', email: '' });
    setEditing(null);
    setError('');
  };

  const handleEdit = (shop) => {
    setFormData({ name: shop.name, phone: shop.phone, email: shop.email });
    setEditing(shop.id);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      setError('');
      if (editing) {
        await updateFloralShop(editing, formData);
      } else {
        await createFloralShop(formData);
      }
      await fetchShops();
      handleReset();
    } catch (err) {
      setError('Failed to save floral shop');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFloralShop(deleteConfirm);
      await fetchShops();
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete floral shop');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-white">Floral Shops</h1>
        <p className="text-gray-400 text-sm mt-1">Manage floral shops for flower order fulfillment</p>
      </div>

      {/* Gold divider */}
      <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, rgba(212,175,127,0.6), transparent)' }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-dark-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-serif text-white mb-4">
              {editing ? 'Edit Shop' : 'Add New Shop'}
            </h2>

            {error && (
              <div className="bg-red-900 bg-opacity-20 border border-red-800 text-red-400 text-sm px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tooele Floral"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. orders@tooelefloral.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. (435) 555-0123"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {editing ? 'Update' : 'Add Shop'}
                </button>
                {editing && (
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shops List */}
        <div className="lg:col-span-2">
          {shops.length === 0 ? (
            <div className="text-center py-12 bg-dark-800 border border-gray-700 border-dashed rounded-xl">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-gray-400 text-sm">No floral shops yet. Add one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-dark-800 border border-gray-700 rounded-lg p-4 flex items-start justify-between hover:border-gold-500 transition"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-base">{shop.name}</h3>
                    <div className="text-gray-400 text-sm mt-2 space-y-1">
                      <p>📧 {shop.email}</p>
                      {shop.phone && <p>📞 {shop.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => handleEdit(shop)}
                      className="p-2 text-gray-400 hover:text-gold-400 hover:bg-gold-500 hover:bg-opacity-10 rounded-lg transition"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(shop.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className="bg-dark-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-medium text-lg mb-2">Delete Shop</h3>
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
