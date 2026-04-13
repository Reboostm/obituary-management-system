/**
 * Embeddable Full Obituary Page — complete HTML with memory wall + form.
 * URL: /api/embed/full/[id]
 * Usage: <iframe src="https://obituary-management-system.vercel.app/api/embed/full/ABC123" ...>
 *
 * JavaScript works inside iframes (unlike GHL Custom HTML blocks),
 * so the memory wall form, carousel, and auto-refresh all function correctly.
 */
import { db } from '../../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.removeHeader('X-Frame-Options');

  const { id } = req.query;

  if (!id) {
    return res.status(200).send(errorPage('Missing obituary ID'));
  }

  try {
    // Fetch obituary
    const docRef = doc(db, 'obituaries', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(200).send(errorPage('Obituary not found'));
    }

    const o = { id, ...docSnap.data() };

    if (o.status !== 'published') {
      return res.status(200).send(errorPage('Obituary is not published'));
    }

    // Fetch memories
    let memories = [];
    try {
      const mq = query(collection(db, 'memories'), where('obituaryId', '==', id));
      const mSnap = await getDocs(mq);
      memories = mSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => m.published !== false)
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds || 0) * 1000;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds || 0) * 1000;
          return tb - ta;
        });
    } catch (e) {
      console.error('Error fetching memories:', e);
    }

    const dates = [o.birthDate, o.deathDate].filter(Boolean).join(' – ');

    // Build carousel HTML
    let carouselHtml = '';
    if (o.images && o.images.length > 0) {
      if (o.images.length === 1) {
        carouselHtml = `<div class="rb-fp-carousel"><img src="${esc(o.images[0])}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block"></div>`;
      } else {
        const slides = o.images.map((u) => `<div class="rb-fp-carousel-slide"><img src="${esc(u)}" alt=""></div>`).join('');
        const dots = o.images.map((_, i) => `<span class="rb-fp-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`).join('');
        carouselHtml = `<div class="rb-fp-carousel"><div class="rb-fp-carousel-track" id="rb-track">${slides}</div><button class="rb-fp-carousel-btn prev" onclick="rbCar(-1)">&#8249;</button><button class="rb-fp-carousel-btn next" onclick="rbCar(1)">&#8250;</button></div><div class="rb-fp-carousel-dots" id="rb-dots">${dots}</div>`;
      }
    }

    // Build services HTML
    let servicesHtml = '';
    if (o.services && o.services.length > 0) {
      const sCards = o.services.map((s) => {
        return `<div class="rb-fp-service-card"><div class="rb-fp-service-type">${esc(s.type)}</div><div class="rb-fp-service-datetime">${s.date ? esc(s.date) : ''}${s.time ? ' at ' + esc(s.time) : ''}</div>${s.location ? '<div class="rb-fp-service-loc">' + esc(s.location) + '</div>' : ''}</div>`;
      }).join('');
      servicesHtml = `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Memorial Services</div><div class="rb-fp-section-line"></div></div><div class="rb-fp-services">${sCards}</div>`;
    }

    // Build memories HTML
    const memoriesHtml = memories.length === 0
      ? '<p style="color:#6b7280;font-size:.85rem;text-align:center;padding:16px 0">No memories shared yet. Be the first.</p>'
      : memories.map((m, idx) => {
          const mDate = m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';
          const photosHtml = m.photos && m.photos.length > 0
            ? `<div class="rb-fp-memory-images">${m.photos.map((p, i) => `<div class="rb-fp-memory-image" data-img="${esc(p)}"><img src="${esc(p)}" alt="Memory photo"></div>`).join('')}</div>`
            : '';
          return `<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">${esc(m.name)}</span><div style="display:flex;align-items:center;gap:8px"><span class="rb-fp-memory-rel">${esc(m.relationship)}</span><button class="rb-fp-memory-share" data-sharer="${esc(m.name)}" title="Share this memory"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.06c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.56 9.31 6.88 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.76 0 1.44-.3 1.96-.77l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></button></div></div><div class="rb-fp-memory-text">${esc(m.memoryText)}</div>${photosHtml}${mDate ? '<div class="rb-fp-memory-date">' + esc(mDate) + '</div>' : ''}</div>`;
        }).join('');

    const apiBase = 'https://obituary-management-system.vercel.app';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:transparent}
.rb-fp{max-width:780px;margin:0 auto}
.rb-fp-header{background:#111827;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;border-bottom:3px solid #d97706}
.rb-fp-deco{display:none}
.rb-fp-name{color:#fff;font-size:2.2rem;margin:0 0 8px;letter-spacing:.04em}
.rb-fp-dates{color:#f59e0b;font-size:1rem;letter-spacing:.1em}
.rb-fp-loc{color:#9ca3af;font-size:.875rem;margin-top:8px;font-style:italic}
.rb-fp-body{background:#f9fafb;padding:32px;border-radius:0 0 16px 16px}
.rb-fp-carousel{position:relative;margin:0 auto 20px;border-radius:12px;overflow:hidden;width:180px;height:200px}
.rb-fp-carousel-track{display:flex;transition:transform .4s ease;height:100%}
.rb-fp-carousel-slide{min-width:100%;height:100%;background:#111827}
.rb-fp-carousel-slide img{width:100%;height:100%;object-fit:cover}
.rb-fp-carousel-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.5);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem}
.rb-fp-carousel-btn.prev{left:8px}.rb-fp-carousel-btn.next{right:8px}
.rb-fp-carousel-dots{text-align:center;margin-top:8px}
.rb-fp-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d1d5db;margin:0 3px;cursor:pointer;transition:background .2s}
.rb-fp-dot.active{background:#d97706}
.rb-fp-section-header{display:flex;align-items:center;gap:12px;margin:24px 0 12px}
.rb-fp-section-line{height:1px;flex:1;background:#e5e7eb}
.rb-fp-section-title{color:#b45309;font-size:1.1rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap}
.rb-fp-text{color:#374151;font-size:1rem;line-height:1.75}
.rb-fp-services{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:8px}
.rb-fp-service-card{background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px}
.rb-fp-service-type{color:#92400e;font-size:1rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
.rb-fp-service-datetime{color:#1f2937;font-size:.9rem;font-weight:600}
.rb-fp-service-loc{color:#4b5563;font-size:.82rem;margin-top:2px}
.rb-fp-mw{margin-top:32px;background:#1e1e2e;border-radius:12px;padding:24px}
.rb-fp-mw-title{color:#f59e0b;font-size:1.4rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:24px;text-align:center}
.rb-fp-memory-card{background:#13131f;border:1px solid #374151;border-radius:10px;padding:16px;margin-bottom:12px}
.rb-fp-memory-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.rb-fp-memory-name{color:#f59e0b;font-size:1.3rem;font-weight:700}
.rb-fp-memory-rel{font-size:.75rem;color:#9ca3af;background:#374151;padding:2px 8px;border-radius:999px}
.rb-fp-memory-text{color:#d1d5db;font-size:.875rem;line-height:1.65}
.rb-fp-memory-date{color:#6b7280;font-size:.75rem;margin-top:8px}
.rb-fp-memory-images{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin:16px 0}
.rb-fp-memory-image{width:100%;aspect-ratio:1;border-radius:6px;border:1px solid #374151;overflow:hidden;cursor:pointer;transition:transform .2s}
.rb-fp-memory-image:hover{transform:scale(1.05)}
.rb-fp-memory-image img{width:100%;height:100%;object-fit:cover;cursor:pointer}
.rb-fp-lightbox{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.9);z-index:9999;align-items:center;justify-content:center}
.rb-fp-lightbox.active{display:flex}
.rb-fp-lightbox-content{position:relative;width:90vw;max-width:60vw;height:auto;max-height:70vh;padding:20px;display:flex;align-items:center;justify-content:center}
.rb-fp-lightbox-img{max-width:100%;max-height:100%;object-fit:contain}
.rb-fp-lightbox-close{position:absolute;top:20px;right:20px;background:rgba(255,255,255,.3);color:#fff;border:none;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer}
.rb-fp-form{background:#13131f;border:1px solid #374151;border-radius:10px;padding:20px;margin-top:16px}
.rb-fp-form-title{color:#fff;font-size:.9rem;margin-bottom:14px}
.rb-fp-field{margin-bottom:12px}
.rb-fp-label{display:block;color:#9ca3af;font-size:.8rem;margin-bottom:4px}
.rb-fp-input,.rb-fp-select,.rb-fp-textarea{width:100%;background:#1e1e2e;border:1px solid #374151;color:#fff;border-radius:8px;padding:10px 12px;font-size:.875rem;box-sizing:border-box;font-family:inherit}
.rb-fp-textarea{resize:vertical;min-height:100px}
.rb-fp-input:focus,.rb-fp-select:focus,.rb-fp-textarea:focus{outline:none;border-color:#d97706}
.rb-fp-submit{background:#d97706;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:.875rem;cursor:pointer;font-family:inherit;transition:background .2s}
.rb-fp-submit:hover{background:#b45309}
.rb-fp-submit:disabled{opacity:.6;cursor:default}
.rb-fp-success{color:#34d399;font-size:.85rem;margin-top:8px}
.rb-fp-error{color:#f87171;font-size:.85rem;margin-top:8px}
.rb-fp-share-section{margin-top:24px;margin-bottom:24px}
.rb-fp-share-buttons{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.rb-fp-share-btn{background:rgba(212,175,127,.1);border:1px solid rgba(212,175,127,.3);color:#d97706;width:44px;height:44px;border-radius:8px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;padding:0}
.rb-fp-share-btn:hover{background:#d97706;color:#fff;border-color:#d97706;transform:scale(1.05)}
.rb-fp-share-btn svg{width:20px;height:20px}
.rb-fp-memory-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.rb-fp-memory-actions{display:flex;gap:8px;align-items:center}
.rb-fp-memory-share{background:none;border:none;color:#6b7280;cursor:pointer;padding:4px;transition:color .2s;font-size:0}
.rb-fp-memory-share:hover{color:#d97706}
.rb-fp-memory-share svg{width:16px;height:16px}
.rb-fp-qr-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.9);z-index:10000;align-items:center;justify-content:center;flex-direction:column}
.rb-fp-qr-modal.active{display:flex}
.rb-fp-qr-content{background:#1e1e2e;border:2px solid #d97706;border-radius:12px;padding:32px;text-align:center;position:relative;max-width:400px;color:#d1d5db}
.rb-fp-qr-close{position:absolute;top:16px;right:16px;background:none;border:none;color:#d97706;font-size:32px;cursor:pointer;transition:color .2s}
.rb-fp-qr-close:hover{color:#f59e0b}
.rb-fp-qr-content p{margin-top:16px;font-size:.9rem}
</style>
</head>
<body>
<div class="rb-fp">
  <div class="rb-fp-header">
    <div class="rb-fp-deco"><div class="rb-fp-deco-line"></div><span style="color:#f59e0b;font-size:1.2rem">&#10013;</span><div class="rb-fp-deco-line"></div></div>
    <h1 class="rb-fp-name">${esc(o.fullName)}</h1>
    ${dates ? `<div class="rb-fp-dates">${esc(dates)}</div>` : ''}
    ${o.location ? `<div class="rb-fp-loc">${esc(o.location)}</div>` : ''}
  </div>
  <div class="rb-fp-body">
    ${carouselHtml}
    ${o.bio ? `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Life &amp; Legacy</div><div class="rb-fp-section-line"></div></div><div class="rb-fp-text">${esc(o.bio).replace(/\n/g, '<br>')}</div>` : ''}
    ${o.survivors ? `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Survived By</div><div class="rb-fp-section-line"></div></div><div class="rb-fp-text">${esc(o.survivors)}</div>` : ''}
    ${o.predeceased ? `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Preceded in Death By</div><div class="rb-fp-section-line"></div></div><div class="rb-fp-text">${esc(o.predeceased)}</div>` : ''}
    ${servicesHtml}
    <div class="rb-fp-share-section"><div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Share This Tribute</div><div class="rb-fp-section-line"></div></div><div class="rb-fp-share-buttons"><button class="rb-fp-share-btn" data-platform="facebook" title="Share on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></button><button class="rb-fp-share-btn" data-platform="twitter" title="Share on Twitter"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 002.856-10.986c-3.477.476-6.7 2.237-8.68 4.967.2-1.993-.641-3.8-2.154-5.597-.897 1.8-2.289 3.393-4.113 4.638A4.848 4.848 0 003 12c0 .396.023.787.068 1.171a13.995 13.995 0 0010.079-6.572c.701 1.495.79 3.418.26 5.042 3.355-1.215 6.282-4.69 6.972-8.84.601 4.383-.298 8.946-3.425 12.108-.675.67-1.404 1.295-2.168 1.87 5.524-.975 9.677-5.218 10.201-10.575.057-.629.076-1.263.076-1.9z"/></svg></button><button class="rb-fp-share-btn" data-platform="email" title="Share via Email"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></button><button class="rb-fp-share-btn" data-platform="sms" title="Share via Text"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 8H6v-2h8v2zm6-4H6v-2h14v2z"/></svg></button><button class="rb-fp-share-btn" data-platform="copy" title="Copy Link"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg></button><button class="rb-fp-share-btn" data-platform="qr" title="Show QR Code"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11h8V3H3v8zm4-4h4v4H7V7zm10-4v8h8V3h-8zm4 4h4v4h-4V7zM3 21h8v-8H3v8zm4-4h4v4H7v-4zm10-4h3v2h-3zm0 4h8v-2h-8zm3-8h-3v3h3z"/></svg></button></div></div>
  </div>
  <div class="rb-fp-mw">
    <div class="rb-fp-mw-title">Memory Wall</div>
    <div id="rb-memories">${memoriesHtml}</div>
    <div class="rb-fp-form">
      <div class="rb-fp-form-title">Share a Memory</div>
      <div class="rb-fp-field"><label class="rb-fp-label">Your Name</label><input class="rb-fp-input" id="rb-mname" placeholder="Jane Smith"></div>
      <div class="rb-fp-field"><label class="rb-fp-label">Relationship</label><select class="rb-fp-select" id="rb-mrel"><option>Family</option><option>Friend</option><option>Colleague</option><option>Other</option></select></div>
      <div class="rb-fp-field"><label class="rb-fp-label">Your Memory</label><textarea class="rb-fp-textarea" id="rb-mtext" placeholder="Share a favorite memory..."></textarea></div>
      <div class="rb-fp-field"><label class="rb-fp-label">Photos (Optional) - <span id="rb-photo-count">0/10 photos</span></label><input type="file" class="rb-fp-input" id="rb-mphoto" accept="image/*" style="padding:8px"></div>
      <button type="button" id="rb-add-photo-btn" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:.85rem;cursor:pointer;margin-bottom:12px;font-family:inherit">+ Add Another Photo</button>
      <div id="rb-mphoto-preview" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:12px"></div>
      <button class="rb-fp-submit" id="rb-msubmit">Share Memory</button>
      <div id="rb-mmsg"></div>
    </div>
  </div>
  <div class="rb-fp-lightbox" id="rb-lightbox">
    <div class="rb-fp-lightbox-content">
      <img class="rb-fp-lightbox-img" id="rb-lightbox-img" src="">
      <button class="rb-fp-lightbox-close" onclick="document.getElementById('rb-lightbox').classList.remove('active')">×</button>
    </div>
  </div>
</div>

<script>
(function(){
  var apiBase = '${apiBase}';
  var obituaryId = '${esc(id)}';
  var carIdx = 0;
  var totalSlides = ${o.images ? o.images.length : 0};

  /* ---- Carousel ---- */
  function updateCarousel() {
    var t = document.getElementById('rb-track');
    if (t) t.style.transform = 'translateX(-' + carIdx + '00%)';
    var dots = document.querySelectorAll('#rb-dots .rb-fp-dot');
    dots.forEach(function(d, i) { d.classList.toggle('active', i === carIdx); });
  }

  window.rbCar = function(dir) {
    carIdx = (carIdx + dir + totalSlides) % totalSlides;
    updateCarousel();
  };

  if (totalSlides > 1) {
    document.querySelectorAll('#rb-dots .rb-fp-dot').forEach(function(dot, i) {
      dot.addEventListener('click', function() { carIdx = i; updateCarousel(); });
    });
    setInterval(function() { carIdx = (carIdx + 1) % totalSlides; updateCarousel(); }, 4000);
  }

  /* ---- Memory Submission with Photos ---- */
  var btn = document.getElementById('rb-msubmit');
  if (btn) {
    btn.addEventListener('click', function() {
      var nameEl = document.getElementById('rb-mname');
      var relEl = document.getElementById('rb-mrel');
      var textEl = document.getElementById('rb-mtext');
      var photoEl = document.getElementById('rb-mphoto');
      var msgEl = document.getElementById('rb-mmsg');
      var name = nameEl.value.trim();
      var rel = relEl.value;
      var text = textEl.value.trim();

      if (!name || !text) {
        msgEl.innerHTML = '<div class="rb-fp-error">Please fill in your name and memory.</div>';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Submitting...';

      // Use accumulated photos
      var photos = selectedPhotos.length > 0 ? selectedPhotos : [];
      submitMemory(name, rel, text, photos);

      function submitMemory(name, rel, text, photos) {
        fetch(apiBase + '/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ obituaryId: obituaryId, name: name, relationship: rel, memoryText: text, photos: photos })
        })
        .then(function(res) { return res.json(); })
        .then(function() {
          nameEl.value = '';
          textEl.value = '';
          selectedPhotos = [];
          if (photoEl) {
            photoEl.value = '';
            document.getElementById('rb-mphoto-preview').innerHTML = '';
          }
          msgEl.innerHTML = '<div class="rb-fp-success">&#10003; Your memory has been shared. Thank you.</div>';
          setTimeout(function() { msgEl.innerHTML = ''; }, 3000);
          refreshMemories();
        })
        .catch(function(err) {
          console.error('Memory submit error:', err);
          msgEl.innerHTML = '<div class="rb-fp-error">Unable to submit. Please check your name and memory, then try again.</div>';
        })
        .finally(function() {
          btn.disabled = false;
          btn.textContent = 'Share Memory';
        });
      }
    });

    // Photo preview with accumulation (max 10 images)
    var selectedPhotos = [];
    var maxPhotos = 10;
    var photoEl = document.getElementById('rb-mphoto');
    var addBtn = document.getElementById('rb-add-photo-btn');

    function updatePreview() {
      var preview = document.getElementById('rb-mphoto-preview');
      var countEl = document.getElementById('rb-photo-count');
      preview.innerHTML = '';
      if (countEl) countEl.textContent = selectedPhotos.length + '/' + maxPhotos + ' photos';
      selectedPhotos.forEach(function(dataUrl) {
        var img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = '160px';
        img.style.height = '160px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid #374151';
        img.style.cursor = 'pointer';
        img.title = 'Click to remove';
        img.onclick = function() {
          selectedPhotos = selectedPhotos.filter(function(p) { return p !== dataUrl; });
          updatePreview();
        };
        preview.appendChild(img);
      });
    }

    if (photoEl) {
      photoEl.addEventListener('change', function() {
        if (this.files.length === 0) return;
        var msgEl = document.getElementById('rb-mmsg');
        Array.from(this.files).forEach(function(file) {
          if (selectedPhotos.length >= maxPhotos) {
            if (msgEl) msgEl.innerHTML = '<div class="rb-fp-error">Maximum ' + maxPhotos + ' photos allowed per memory.</div>';
            return;
          }
          var reader = new FileReader();
          reader.onload = function(e) {
            if (selectedPhotos.length >= maxPhotos) return;
            // Compress image to reduce file size
            var img = new Image();
            img.onload = function() {
              var canvas = document.createElement('canvas');
              var maxWidth = 800;
              var maxHeight = 800;
              var width = img.width;
              var height = img.height;
              if (width > height) {
                if (width > maxWidth) {
                  height *= maxWidth / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width *= maxHeight / height;
                  height = maxHeight;
                }
              }
              canvas.width = width;
              canvas.height = height;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              var compressedData = canvas.toDataURL('image/jpeg', 0.7);
              selectedPhotos.push(compressedData);
              updatePreview();
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
        this.value = '';
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', function(e) {
        e.preventDefault();
        photoEl.click();
      });
    }
  }

  /* ---- Iframe Height Notification ---- */
  function notifyHeight() {
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
    try { parent.postMessage({ rbHeight: h }, '*'); } catch(e) {}
  }

  /* ---- Refresh Memories ---- */
  function refreshMemories() {
    fetch(apiBase + '/api/memories/' + obituaryId)
      .then(function(res) { return res.json(); })
      .then(function(memories) {
        var el = document.getElementById('rb-memories');
        if (!el) return;
        if (!memories || !memories.length) {
          el.innerHTML = '<p style="color:#6b7280;font-size:.85rem;text-align:center;padding:16px 0">No memories shared yet. Be the first.</p>';
          notifyHeight();
          return;
        }
        el.innerHTML = memories.map(function(m) {
          var d = m.createdAt ? new Date(m.createdAt.seconds ? m.createdAt.seconds * 1000 : m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return '<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">' + escJs(m.name) + '</span><div style="display:flex;align-items:center;gap:8px"><span class="rb-fp-memory-rel">' + escJs(m.relationship) + '</span><button class="rb-fp-memory-share" data-sharer="' + escJs(m.name) + '" title="Share this memory"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.06c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.56 9.31 6.88 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.76 0 1.44-.3 1.96-.77l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></button></div></div><div class="rb-fp-memory-text">' + escJs(m.memoryText) + '</div>' + (m.photos && m.photos.length > 0 ? '<div class="rb-fp-memory-images">' + m.photos.map(function(p) { var esc_p = p.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return '<div class="rb-fp-memory-image" data-img="' + esc_p + '"><img src="' + esc_p + '" alt="Memory photo"></div>'; }).join('') + '</div>' : '') + (d ? '<div class="rb-fp-memory-date">' + d + '</div>' : '') + '</div>';
        }).join('');
        // Attach click handlers to newly loaded memory images
        attachMemoryImageListeners();
        // Re-attach share button listeners for newly loaded memories
        document.querySelectorAll('.rb-fp-memory-share').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var sharer = this.getAttribute('data-sharer');
            rbShare('facebook', sharer);
          });
        });
        setTimeout(notifyHeight, 100);
        document.querySelectorAll('#rb-memories img').forEach(function(img) { img.addEventListener('load', notifyHeight); });
      });
  }

  function escJs(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* All photos displayed in grid - no rotation */

  /* ---- Image Lightbox ---- */
  window.rbOpenLightbox = function(imageSrc) {
    var lightbox = document.getElementById('rb-lightbox');
    var img = document.getElementById('rb-lightbox-img');
    img.src = imageSrc;
    lightbox.classList.add('active');
  };

  var lightbox = document.getElementById('rb-lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('active');
    });
  }

  /* ---- Memory Image Lightbox Handlers ---- */
  function attachMemoryImageListeners() {
    document.querySelectorAll('.rb-fp-memory-image').forEach(function(div) {
      div.addEventListener('click', function() {
        var img = this.getAttribute('data-img');
        if (img) rbOpenLightbox(img);
      });
    });
  }
  attachMemoryImageListeners();

  /* ---- Social Media Sharing ---- */
  var shareData = {
    obituaryId: obituaryId,
    name: '${esc(o.fullName)}',
    url: (function() {
      try { return window.location.href; } catch(e) { return '${apiBase}/api/embed/full/${esc(id)}'; }
    })()
  };

  window.rbShare = function(platform, memorySharer) {
    var baseUrl = shareData.url;
    var personName = shareData.name;
    var memoryText = memorySharer ? memorySharer + ' shared a memory of ' + personName : 'View ' + personName + ' obituary and share memories';
    var fullText = memoryText + ': ' + baseUrl;

    var shareUrls = {
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(baseUrl),
      twitter: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(baseUrl) + '&text=' + encodeURIComponent(memoryText),
      email: 'mailto:?subject=' + encodeURIComponent('Obituary: ' + personName) + '&body=' + encodeURIComponent(fullText),
      sms: 'sms:?body=' + encodeURIComponent(fullText),
      copy: null,
      qr: null
    };

    if (platform === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(baseUrl).then(function() {
          alert('Link copied to clipboard!');
        }).catch(function() {
          alert('Could not copy to clipboard');
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = baseUrl;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          alert('Link copied to clipboard!');
        } catch(e) {
          alert('Could not copy to clipboard');
        }
        document.body.removeChild(ta);
      }
    } else if (platform === 'qr') {
      rbShowQRCode(baseUrl);
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=600');
    }
  };

  function rbShowQRCode(url) {
    var modal = document.getElementById('rb-qr-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rb-qr-modal';
      modal.className = 'rb-fp-qr-modal active';
      modal.innerHTML = '<div class="rb-fp-qr-content"><button class="rb-fp-qr-close">×</button><div id="rb-qr-code"></div><p>Scan to view obituary</p></div>';
      document.body.appendChild(modal);
      var closeBtn = modal.querySelector('.rb-fp-qr-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          modal.classList.remove('active');
        });
      }
    }
    var qrDiv = document.getElementById('rb-qr-code');
    qrDiv.innerHTML = '';
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode.js/1.5.3/qrcode.min.js';
    script.onload = function() {
      try {
        new QRCode(qrDiv, { text: url, width: 256, height: 256, colorDark: '#d97706', colorLight: '#1e1e2e' });
      } catch(e) {
        qrDiv.innerHTML = '<p style="color:#f87171">Could not generate QR code</p>';
      }
    };
    script.onerror = function() {
      qrDiv.innerHTML = '<p style="color:#f87171">Could not load QR code library</p>';
    };
    document.head.appendChild(script);
    modal.classList.add('active');
  }

  /* Share button event listeners */
  document.querySelectorAll('.rb-fp-share-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      rbShare(this.dataset.platform);
    });
  });

  /* Memory card share button listeners */
  document.querySelectorAll('.rb-fp-memory-share').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var sharer = this.getAttribute('data-sharer');
      rbShare('facebook', sharer);
    });
  });

  /* ---- Initial Height & Resize Events ---- */
  notifyHeight();
  window.addEventListener('load', notifyHeight);
  window.addEventListener('resize', notifyHeight);
  [100, 300, 600, 1000, 2000].forEach(function(t) { setTimeout(notifyHeight, t); });
  document.querySelectorAll('img').forEach(function(img) { img.addEventListener('load', notifyHeight); });
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(notifyHeight);
    ro.observe(document.body);
  }
})();
</script>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    console.error('Embed full page error:', error);
    return res.status(200).send(errorPage('Unable to load obituary. ' + error.message));
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorPage(msg) {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Georgia,serif;background:transparent">
<p style="color:#6b7280;font-size:.9rem;text-align:center;padding:32px">${esc(msg)}</p>
</body></html>`;
}
