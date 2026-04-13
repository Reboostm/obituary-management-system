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
        carouselHtml = `<div class="rb-fp-carousel"><img src="${esc(o.images[0])}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;display:block"></div>`;
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
      : memories.map((m) => {
          const mDate = m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';
          return `<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">${esc(m.name)}</span><span class="rb-fp-memory-rel">${esc(m.relationship)}</span></div><div class="rb-fp-memory-text">${esc(m.memoryText)}</div>${mDate ? '<div class="rb-fp-memory-date">' + esc(mDate) + '</div>' : ''}</div>`;
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
.rb-fp-carousel{position:relative;margin-bottom:28px;border-radius:12px;overflow:hidden;max-height:220px}
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
.rb-fp-mw-title{color:#f59e0b;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
.rb-fp-memory-card{background:#13131f;border:1px solid #374151;border-radius:10px;padding:16px;margin-bottom:12px}
.rb-fp-memory-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.rb-fp-memory-name{color:#fff;font-size:.9rem;font-weight:600}
.rb-fp-memory-rel{font-size:.75rem;color:#9ca3af;background:#374151;padding:2px 8px;border-radius:999px}
.rb-fp-memory-text{color:#d1d5db;font-size:.875rem;line-height:1.65}
.rb-fp-memory-date{color:#6b7280;font-size:.75rem;margin-top:8px}
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
  </div>
  <div class="rb-fp-mw">
    <div class="rb-fp-mw-title">Memory Wall</div>
    <div id="rb-memories">${memoriesHtml}</div>
    <div class="rb-fp-form">
      <div class="rb-fp-form-title">Share a Memory</div>
      <div class="rb-fp-field"><label class="rb-fp-label">Your Name</label><input class="rb-fp-input" id="rb-mname" placeholder="Jane Smith"></div>
      <div class="rb-fp-field"><label class="rb-fp-label">Relationship</label><select class="rb-fp-select" id="rb-mrel"><option>Family</option><option>Friend</option><option>Colleague</option><option>Other</option></select></div>
      <div class="rb-fp-field"><label class="rb-fp-label">Your Memory</label><textarea class="rb-fp-textarea" id="rb-mtext" placeholder="Share a favorite memory..."></textarea></div>
      <button class="rb-fp-submit" id="rb-msubmit">Share Memory</button>
      <div id="rb-mmsg"></div>
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

  /* ---- Memory Submission ---- */
  var btn = document.getElementById('rb-msubmit');
  if (btn) {
    btn.addEventListener('click', function() {
      var nameEl = document.getElementById('rb-mname');
      var relEl = document.getElementById('rb-mrel');
      var textEl = document.getElementById('rb-mtext');
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

      fetch(apiBase + '/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obituaryId: obituaryId, name: name, relationship: rel, memoryText: text, photos: [] })
      })
      .then(function(res) { return res.json(); })
      .then(function() {
        nameEl.value = '';
        textEl.value = '';
        msgEl.innerHTML = '<div class="rb-fp-success">&#10003; Your memory has been shared. Thank you.</div>';
        refreshMemories();
      })
      .catch(function() {
        msgEl.innerHTML = '<div class="rb-fp-error">Unable to submit. Please try again.</div>';
      })
      .finally(function() {
        btn.disabled = false;
        btn.textContent = 'Share Memory';
      });
    });
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
          return;
        }
        el.innerHTML = memories.map(function(m) {
          var d = m.createdAt ? new Date(m.createdAt.seconds ? m.createdAt.seconds * 1000 : m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return '<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">' + escJs(m.name) + '</span><span class="rb-fp-memory-rel">' + escJs(m.relationship) + '</span></div><div class="rb-fp-memory-text">' + escJs(m.memoryText) + '</div>' + (d ? '<div class="rb-fp-memory-date">' + d + '</div>' : '') + '</div>';
        }).join('');
      });
  }

  function escJs(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
