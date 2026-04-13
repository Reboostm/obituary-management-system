import { useState, useEffect } from 'react';
import MemoryWall from './MemoryWall';

function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images]);

  if (!images || images.length === 0) return null;

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="mb-6">
      {/* Main image — fixed 16:9 container, image scales to fit without cropping */}
      <div className="relative rounded-xl overflow-hidden bg-gray-200" style={{ aspectRatio: '16/9', maxHeight: '260px' }}>
        <img
          src={images[idx]}
          alt={`Photo ${idx + 1}`}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',   // contain = no cropping, full image always visible
            objectPosition: 'center',
            background: '#e5e7eb',
          }}
        />
        {/* Nav arrows — only show if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-75 transition text-base leading-none"
            >‹</button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-75 transition text-base leading-none"
            >›</button>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-0.5 rounded">
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Compact thumbnail strip — only show if more than 1 image */}
      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 justify-center flex-wrap">
          {images.map((url, i) => (
            <button key={i} onClick={() => setIdx(i)} className="shrink-0">
              <img
                src={url}
                alt={`Thumb ${i + 1}`}
                className={`w-10 h-10 object-cover rounded border-2 transition ${
                  i === idx ? 'border-amber-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-gray-300" />
      <span className="text-xs uppercase tracking-widest text-amber-700 font-medium whitespace-nowrap">{title}</span>
      <div className="h-px flex-1 bg-gray-300" />
    </div>
  );
}

export default function ObituaryPreview({ obituary, onEdit, onBack }) {
  const [showMemoryWall, setShowMemoryWall] = useState(false);

  const {
    fullName, birthDate, deathDate, location,
    bio, survivors, predeceased, services, images,
  } = obituary;

  return (
    <div>
      {/* Preview Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif text-white">Preview</h1>
          <p className="text-gray-400 text-sm mt-0.5">How this obituary will appear when published</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMemoryWall(!showMemoryWall)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              showMemoryWall
                ? 'bg-purple-700 text-white'
                : 'bg-dark-800 border border-gray-700 text-gray-300 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {showMemoryWall ? 'Hide Memories' : 'View Memories'}
          </button>
          <button
            onClick={onEdit}
            className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* Memory Wall (admin) */}
      {showMemoryWall && obituary.id && (
        <div className="mb-8 bg-dark-800 border border-purple-800 border-opacity-40 rounded-xl p-6">
          <MemoryWall obituaryId={obituary.id} obituaryName={obituary.fullName} />
        </div>
      )}

      {/* Obituary Display */}
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-3xl mx-auto">

        {/* Header Banner */}
        <div className="bg-gray-900 px-8 py-10 text-center border-b-4 border-amber-600">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-amber-600" />
            <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a5 5 0 100 10A5 5 0 0012 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
            </svg>
            <div className="h-px w-16 bg-amber-600" />
          </div>
          <h1 className="text-4xl font-serif text-white mb-2 tracking-wide">{fullName || 'Name'}</h1>
          {(birthDate || deathDate) && (
            <p className="text-amber-400 text-base tracking-widest font-light mt-1">
              {birthDate && <span>{birthDate}</span>}
              {birthDate && deathDate && <span className="mx-3 opacity-60">•</span>}
              {deathDate && <span>{deathDate}</span>}
            </p>
          )}
          {location && <p className="text-gray-400 text-sm mt-3 italic">{location}</p>}
        </div>

        {/* Body */}
        <div className="bg-gray-50 px-8 py-10">
          {/* Photo Carousel (white background version) */}
          {images && images.length > 0 && (
            <ImageCarousel images={images} />
          )}

          {/* Biography */}
          {bio && (
            <section className="mb-2">
              <SectionHeader title="Life & Legacy" />
              <div className="text-gray-700 text-base leading-relaxed font-serif whitespace-pre-line">{bio}</div>
            </section>
          )}

          {/* Survived By */}
          {survivors && (
            <section>
              <SectionHeader title="Survived By" />
              <p className="text-gray-700 text-base leading-relaxed font-serif">{survivors}</p>
            </section>
          )}

          {/* Predeceased */}
          {predeceased && (
            <section>
              <SectionHeader title="Preceded in Death By" />
              <p className="text-gray-700 text-base leading-relaxed font-serif">{predeceased}</p>
            </section>
          )}

          {/* Services */}
          {services && services.filter((s) => s.date || s.location || s.virtualLink).length > 0 && (
            <section>
              <SectionHeader title="Memorial Services" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.filter((s) => s.date || s.location || s.virtualLink).map((svc, i) => {
                  const isVirtualViewing = svc.type === 'Virtual Viewing';
                  return (
                    <div key={i} className={`border rounded-lg px-5 py-4 ${isVirtualViewing ? 'bg-amber-100 border-amber-400' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: isVirtualViewing ? '#b45309' : '#b45309'}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={`text-xs font-medium uppercase tracking-widest ${isVirtualViewing ? 'text-amber-900' : 'text-amber-900'}`}>{svc.type}</span>
                      </div>
                      {(svc.date || svc.time) && (
                        <p className="text-gray-800 text-sm font-serif">
                          {svc.date}{svc.date && svc.time ? ' at ' : ''}{svc.time}
                        </p>
                      )}
                      {isVirtualViewing && svc.virtualLink ? (
                        <a href={svc.virtualLink} target="_blank" rel="noopener noreferrer" className="inline-block bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded mt-2 transition">
                          Join Virtual Service →
                        </a>
                      ) : (
                        svc.location && <p className="text-gray-600 text-sm italic mt-0.5">{svc.location}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

      </div>

      <div className="text-center mt-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm transition">
          ← Back to list
        </button>
      </div>
    </div>
  );
}
