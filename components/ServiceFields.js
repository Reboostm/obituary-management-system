const SERVICE_TYPES = [
  'Funeral Service',
  'Wake',
  'Visitation',
  'Viewing',
  'Graveside Service',
  'Memorial Service',
  'Celebration of Life',
  'Funeral Mass',
  'Rosary',
  'Virtual Viewing',
];

const EMPTY_SERVICE = { date: '', time: '', type: 'Funeral Service', location: '', virtualLink: '' };

export default function ServiceFields({ services = [], onChange }) {
  const safeServices = services.length > 0 ? services : [{ ...EMPTY_SERVICE }];

  const update = (idx, field, value) => {
    const next = safeServices.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    onChange(next);
  };

  const add = () => {
    if (safeServices.length >= 5) return;
    onChange([...safeServices, { ...EMPTY_SERVICE }]);
  };

  const remove = (idx) => {
    if (safeServices.length <= 1) return;
    onChange(safeServices.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {safeServices.map((svc, idx) => (
        <div key={idx} className="bg-dark-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gold-400 uppercase tracking-widest">
              Service {idx + 1}
            </span>
            {safeServices.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-gray-500 hover:text-red-400 text-xs transition"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Type */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={svc.type}
                onChange={(e) => update(idx, 'type', e.target.value)}
                className={inputClass}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="text"
                value={svc.date}
                onChange={(e) => update(idx, 'date', e.target.value)}
                placeholder="e.g. Saturday, April 12"
                className={inputClass}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time</label>
              <input
                type="text"
                value={svc.time}
                onChange={(e) => update(idx, 'time', e.target.value)}
                placeholder="e.g. 2:00 PM"
                className={inputClass}
              />
            </div>

            {/* Location or Virtual Link */}
            {svc.type === 'Virtual Viewing' ? (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Virtual Service Link</label>
                <input
                  type="text"
                  value={svc.virtualLink}
                  onChange={(e) => update(idx, 'virtualLink', e.target.value)}
                  placeholder="e.g. https://zoom.us/j/..."
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={svc.location}
                  onChange={(e) => update(idx, 'location', e.target.value)}
                  placeholder="e.g. Grace Memorial Chapel"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {safeServices.length < 5 && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Service ({safeServices.length}/5)
        </button>
      )}
    </div>
  );
}

const inputClass =
  'w-full bg-dark-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent ' +
  'placeholder-gray-600 transition';
