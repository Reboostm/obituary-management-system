import { useEffect, useState } from 'react';
import { getMemoriesForObituary, deleteMemory, setMemoryPublished } from '../lib/memories';
import MemoryForm from './MemoryForm';

export default function MemoryWall({ obituaryId, obituaryName }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState({});

  useEffect(() => {
    if (obituaryId) fetchMemories();
  }, [obituaryId]);

  // Auto-rotate carousel images every 4 seconds
  useEffect(() => {
    const intervals = memories
      .filter((m) => m.photos?.length > 0)
      .map((m) => {
        return setInterval(() => {
          setCarouselIndex((prev) => ({
            ...prev,
            [m.id]: ((prev[m.id] || 0) + 1) % m.photos.length,
          }));
        }, 4000);
      });

    return () => intervals.forEach((i) => clearInterval(i));
  }, [memories]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const data = await getMemoriesForObituary(obituaryId);
      setMemories(data);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(id + '_delete');
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublished = async (memory) => {
    const newVal = !memory.published;
    setActionLoading(memory.id + '_toggle');
    try {
      await setMemoryPublished(memory.id, newVal);
      setMemories((prev) =>
        prev.map((m) => (m.id === memory.id ? { ...m, published: newVal } : m))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-serif text-white">Memory Wall</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'} submitted for {obituaryName}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-gray-400 hover:text-gold-400 text-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Memory
          </button>
          <button
            onClick={fetchMemories}
            className="text-gray-400 hover:text-white text-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Memory Form */}
      {showForm && (
        <MemoryForm
          obituaryId={obituaryId}
          onMemoryAdded={() => {
            setShowForm(false);
            fetchMemories();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {memories.length === 0 ? (
        <div className="text-center py-12 bg-dark-800 border border-gray-700 border-dashed rounded-xl">
          <p className="text-gray-500 text-sm">No memories have been submitted yet.</p>
          <p className="text-gray-600 text-xs mt-1">Once the full-page embed is live, visitors can share memories.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => {
            const isFlowerOrder = memory.isFlowerOrder;

            return (
            <div
              key={memory.id}
              className={`border rounded-xl p-6 transition ${
                isFlowerOrder
                  ? 'bg-amber-50 border-amber-200'
                  : memory.published
                  ? 'bg-dark-800 border-gray-700'
                  : 'bg-dark-800 border-yellow-800 border-opacity-50 opacity-60'
              }`}
            >
              {/* Flower Order Image - Top */}
              {isFlowerOrder && memory.flowerImage && (
                <div className="mb-4 -m-6 mb-4 relative">
                  <img
                    src={memory.flowerImage}
                    alt={memory.flowerName}
                    className="w-full h-48 object-cover rounded-t-xl"
                  />
                </div>
              )}

              {/* Memory Header - Name & Relationship */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {isFlowerOrder && <span className="text-2xl">💐</span>}
                    <p className={`font-medium text-base mb-0 ${
                      isFlowerOrder ? 'text-amber-900' : 'text-gold-400'
                    }`}>
                      {memory.name || 'Anonymous'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-3 py-1.5 rounded-full border ${
                      isFlowerOrder
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-gold-500 bg-opacity-20 border-gold-500 border-opacity-40 text-gold-300'
                    }`}>
                      {memory.relationship || 'Other'}
                    </span>
                    {isFlowerOrder && memory.flowerName && (
                      <span className="text-xs px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-full">
                        {memory.flowerName}
                      </span>
                    )}
                    {!memory.published && !isFlowerOrder && (
                      <span className="text-xs px-3 py-1.5 bg-yellow-900 bg-opacity-50 border border-yellow-700 border-opacity-40 text-yellow-400 rounded-full">
                        Hidden from public
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {!isFlowerOrder && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePublished(memory)}
                      disabled={actionLoading === memory.id + '_toggle'}
                      title={memory.published ? 'Hide from public' : 'Show on public page'}
                      className={`p-2 rounded-lg text-sm transition ${
                        memory.published
                          ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-900 hover:bg-opacity-20'
                          : 'text-yellow-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {actionLoading === memory.id + '_toggle' ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : memory.published ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(memory.id)}
                      title="Delete memory"
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Memory Text */}
              <p className={`text-sm leading-relaxed mb-4 ${
                isFlowerOrder ? 'text-amber-900' : 'text-gray-300'
              }`}>
                {memory.memoryText}
              </p>

              {/* Photos - Auto-rotating carousel */}
              {memory.photos && memory.photos.length > 0 && (
                <div className="mb-4">
                  <div className="relative bg-dark-900 rounded-lg overflow-hidden border border-gray-600">
                    {memory.photos.length === 1 ? (
                      <img
                        src={memory.photos[0]}
                        alt="Memory photo"
                        className="w-full h-56 object-cover"
                      />
                    ) : (
                      <>
                        <img
                          src={memory.photos[carouselIndex[memory.id] || 0]}
                          alt={`Memory photo ${(carouselIndex[memory.id] || 0) + 1}`}
                          className="w-full h-56 object-cover transition-opacity duration-500"
                        />
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-2">
                          {memory.photos.map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 rounded-full transition-all ${
                                idx === (carouselIndex[memory.id] || 0)
                                  ? 'w-2 bg-gold-400'
                                  : 'w-1.5 bg-gray-500'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <p className={`text-xs ${
                isFlowerOrder ? 'text-amber-700' : 'text-gray-500'
              }`}>
                {formatDate(memory.createdAt)}
              </p>
            </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className="bg-dark-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-medium text-lg mb-2">Delete Memory</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete this memory. It cannot be recovered.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading === confirmDelete + '_delete'}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm transition disabled:opacity-60"
              >
                {actionLoading === confirmDelete + '_delete' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
