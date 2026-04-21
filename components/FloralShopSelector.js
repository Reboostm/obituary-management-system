import { useState, useEffect } from 'react';
import { getFloralShops } from '../lib/floralShops';

const inputClass = 'w-full bg-dark-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder-gray-600 transition';

export default function FloralShopSelector({ selectedShopId, onChange }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const data = await getFloralShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load floral shops:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-dark-800 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">Floral Shop (for flower orders)</label>
      <select
        value={selectedShopId || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputClass}
      >
        <option value="">— Select a floral shop —</option>
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </select>
      {shops.length === 0 && (
        <p className="text-xs text-yellow-600 mt-1">
          ⚠️ No floral shops configured. Add one in Settings first.
        </p>
      )}
    </div>
  );
}
