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
        const isVirtualViewing = s.type === 'Virtual Viewing';
        const locationOrLink = isVirtualViewing
          ? (s.virtualLink ? `<a href="${esc(s.virtualLink)}" target="_blank" rel="noopener noreferrer" class="rb-fp-virtual-link">Join Virtual Service</a>` : '')
          : (s.location ? `<div class="rb-fp-service-loc">${esc(s.location)}</div>` : '');
        return `<div class="rb-fp-service-card${isVirtualViewing ? ' rb-fp-service-card-virtual' : ''}"><div class="rb-fp-service-type">${esc(s.type)}</div><div class="rb-fp-service-datetime">${s.date ? esc(s.date) : ''}${s.time ? ' at ' + esc(s.time) : ''}</div>${locationOrLink}</div>`;
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
          return `<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">${esc(m.name)}</span><div style="display:flex;align-items:center;gap:8px"><span class="rb-fp-memory-rel">${esc(m.relationship)}</span><button class="rb-fp-memory-share" data-sharer="${esc(m.name)}" title="Share this memory">Share</button></div></div><div class="rb-fp-memory-text">${esc(m.memoryText)}</div>${photosHtml}${mDate ? '<div class="rb-fp-memory-date">' + esc(mDate) + '</div>' : ''}</div>`;
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
.rb-fp-section-title{color:#d4af7f;font-size:1.4rem;font-weight:800;text-transform:uppercase;letter-spacing:.15em;white-space:nowrap}
.rb-fp-text{color:#374151;font-size:1rem;line-height:1.75}
.rb-fp-services{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:8px}
.rb-fp-service-card{background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px}
.rb-fp-service-type{color:#92400e;font-size:1rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
.rb-fp-service-datetime{color:#1f2937;font-size:.9rem;font-weight:600}
.rb-fp-service-loc{color:#4b5563;font-size:.82rem;margin-top:2px}
.rb-fp-service-card-virtual{background:#d4af7f;border:2px solid #f59e0b}
.rb-fp-virtual-link{display:inline-block;background:#d97706;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:.85rem;font-weight:600;margin-top:8px;transition:all .2s;border:none;cursor:pointer}
.rb-fp-virtual-link:hover{background:#b45309;transform:scale(1.05)}
.rb-fp-mw{margin-top:-16px;background:linear-gradient(180deg,#1e1e2e 0%,#252533 100%);border-radius:0;padding:40px 32px;border:none;border-top:1px solid rgba(217,119,6,.15);box-shadow:none}
.rb-fp-mw-title{color:#f59e0b;font-size:1.8rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;margin-bottom:40px;text-align:center;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.rb-fp-memory-card{background:linear-gradient(135deg,#13131f 0%,#1a1a26 100%);border:2px solid #d4af7f;border-radius:14px;padding:20px;margin-bottom:18px;transition:all .3s ease;box-shadow:0 2px 8px rgba(212,175,127,.1)}
.rb-fp-memory-card:hover{border-color:#f3c071;box-shadow:0 8px 20px rgba(212,175,127,.25);transform:translateY(-2px)}
.rb-fp-memory-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.rb-fp-memory-name{color:#f59e0b;font-size:1.6rem;font-weight:800;letter-spacing:.03em}
.rb-fp-memory-rel{font-size:.75rem;color:#d1d5db;background:rgba(217,119,6,.15);padding:4px 10px;border-radius:999px;border:1px solid rgba(217,119,6,.3);font-weight:600}
.rb-fp-memory-text{color:#e5e7eb;font-size:.9rem;line-height:1.8;margin:12px 0}
.rb-fp-memory-date{color:#9ca3af;font-size:.8rem;margin-top:12px;font-style:italic}
.rb-fp-memory-images{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin:16px 0}
.rb-fp-memory-image{width:100%;aspect-ratio:1;border-radius:6px;border:1px solid #374151;overflow:hidden;cursor:pointer;transition:transform .2s}
.rb-fp-memory-image:hover{transform:scale(1.05)}
.rb-fp-memory-image img{width:100%;height:100%;object-fit:cover;cursor:pointer}
.rb-fp-lightbox{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.95);z-index:9999;align-items:center;justify-content:center;padding:20px}
.rb-fp-lightbox.active{display:flex !important;visibility:visible;opacity:1}
.rb-fp-lightbox-content{position:relative;width:100%;height:auto;max-width:90vw;max-height:80vh;display:flex;align-items:center;justify-content:center;z-index:10001}
.rb-fp-lightbox-img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;position:relative;z-index:10001}
.rb-fp-lightbox-close{position:absolute;top:16px;right:16px;background:rgba(212,175,127,.3);color:#d4af7f;border:none;width:48px;height:48px;border-radius:50%;font-size:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:10002}
.rb-fp-lightbox-close:hover{background:rgba(212,175,127,.5);color:#f3c071}
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
.rb-fp-share-section{margin-top:32px;margin-bottom:0;margin-left:-64px;margin-right:-64px;background:#000;border:none;border-radius:0;padding:24px calc(32px + 64px)}
.rb-fp-share-buttons{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;max-width:900px;margin:0 auto}
.rb-fp-share-btn{background:#d4af7f;color:#000;border:none;border-radius:12px;cursor:pointer;transition:all .3s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 20px;font-size:.85rem;font-weight:700;letter-spacing:.08em;min-width:100px;box-shadow:0 4px 12px rgba(212,175,127,.3);text-transform:uppercase}
.rb-fp-share-btn:hover{background:#f3c071;transform:translateY(-2px);box-shadow:0 6px 16px rgba(212,175,127,.4)}
.rb-fp-share-btn:active{transform:translateY(0);box-shadow:0 2px 8px rgba(212,175,127,.2)}
.rb-fp-memory-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.rb-fp-memory-actions{display:flex;gap:8px;align-items:center}
.rb-fp-memory-share{background:rgba(217,119,6,.1);border:none;color:#d97706;cursor:pointer;padding:6px 8px;transition:all .2s;font-size:.85rem;border-radius:6px;font-weight:600;border:1px solid rgba(217,119,6,.2)}
.rb-fp-memory-share:hover{background:rgba(217,119,6,.2);border-color:#d97706;transform:scale(1.08)}
.rb-fp-memory-share svg{width:16px;height:16px}
@media (max-width:640px){
.rb-fp-header{padding:24px 20px}
.rb-fp-name{font-size:1.8rem}
.rb-fp-body{padding:20px}
.rb-fp-section-header{flex-wrap:wrap;justify-content:center;white-space:normal;margin:20px 0 16px}
.rb-fp-section-line{display:none}
.rb-fp-section-title{font-size:1.1rem;margin-bottom:8px;width:100%}
.rb-fp-services{grid-template-columns:1fr}
.rb-fp-share-section{margin:0;padding:24px 20px;background:#000}
.rb-fp-share-buttons{justify-content:center}
.rb-fp-share-btn{min-width:90px;padding:12px 16px;font-size:.8rem}}
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
    <div class="rb-fp-share-section"><div style="text-align:center;margin-bottom:12px"><div class="rb-fp-section-title">Share This Tribute</div></div><div class="rb-fp-share-buttons"><button class="rb-fp-share-btn" data-platform="facebook" title="Share on Facebook">Facebook</button><button class="rb-fp-share-btn" data-platform="twitter" title="Share on Twitter">Twitter</button><button class="rb-fp-share-btn" data-platform="email" title="Share via Email">Email</button><button class="rb-fp-share-btn" data-platform="copy" title="Copy Link">Copy Link</button></div></div>
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
          return '<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">' + escJs(m.name) + '</span><div style="display:flex;align-items:center;gap:8px"><span class="rb-fp-memory-rel">' + escJs(m.relationship) + '</span><button class="rb-fp-memory-share" data-sharer="' + escJs(m.name) + '" title="Share this memory">Share</button></div></div><div class="rb-fp-memory-text">' + escJs(m.memoryText) + '</div>' + (m.photos && m.photos.length > 0 ? '<div class="rb-fp-memory-images">' + m.photos.map(function(p) { var esc_p = p.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return '<div class="rb-fp-memory-image" data-img="' + esc_p + '"><img src="' + esc_p + '" alt="Memory photo"></div>'; }).join('') + '</div>' : '') + (d ? '<div class="rb-fp-memory-date">' + d + '</div>' : '') + '</div>';
        }).join('');
        // Attach click handlers to newly loaded memory images
        attachMemoryImageListeners();
        // Re-attach share button listeners will be done after rbShare function is defined
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
  var getShareUrl = function() {
    // Try to get shareUrl from query parameter (passed from embed code)
    try {
      var params = new URLSearchParams(window.location.search);
      var shareUrl = params.get('shareUrl');
      if (shareUrl) return decodeURIComponent(shareUrl);
    } catch(e) {}
    // Fallback to current location
    try { return window.location.href; } catch(e) { return '${apiBase}/api/embed/full/${esc(id)}'; }
  };
  var shareData = {
    obituaryId: obituaryId,
    name: '${esc(o.fullName)}',
    url: getShareUrl()
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
      copy: null
    };

    if (platform === 'copy') {
      var copied = false;
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(baseUrl).then(function() {
          alert('Link copied to clipboard!');
          copied = true;
        }).catch(function() {
          // Fallback if clipboard API fails
          copyUsingExecCommand();
        });
      } else {
        copyUsingExecCommand();
      }
      function copyUsingExecCommand() {
        if (copied) return;
        var ta = document.createElement('textarea');
        ta.value = baseUrl;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        ta.style.top = '-999999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          var success = document.execCommand('copy');
          if (success) {
            alert('Link copied to clipboard!');
          } else {
            throw new Error('execCommand failed');
          }
        } catch(e) {
          alert('Could not copy to clipboard');
        }
        document.body.removeChild(ta);
      }
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=600');
    }
  };

  /* Share button event listeners */
  document.querySelectorAll('.rb-fp-share-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      rbShare(this.dataset.platform);
    });
  });

  /* Attach share button listeners */
  function attachShareListeners() {
    document.querySelectorAll('.rb-fp-share-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        rbShare(this.dataset.platform);
      });
    });
    document.querySelectorAll('.rb-fp-memory-share').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var sharer = this.getAttribute('data-sharer');
        rbShare('facebook', sharer);
      });
    });
  }

  attachShareListeners();

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
