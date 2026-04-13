/**
 * All Obituaries Widget — served as JavaScript from Vercel.
 * URL: /api/embed/ao.js
 * GHL embed: <div id="rb-ao-root"></div><script src="https://obituary-management-system.vercel.app/api/embed/ao.js"></script>
 */
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.removeHeader('X-Frame-Options');

  try {
    const q = query(collection(db, 'obituaries'), where('status', '==', 'published'));
    const snapshot = await getDocs(q);

    const obituaries = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o) => o.createdAt)
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds || 0) * 1000;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds || 0) * 1000;
        return tb - ta;
      })
      .map((o) => ({
        fullName: o.fullName || '',
        birthDate: o.birthDate || '',
        deathDate: o.deathDate || '',
        location: o.location || '',
        bio: o.bio || '',
        images: o.images || [],
        url: o.url || '#',
      }));

    const dataJson = JSON.stringify(obituaries);

    const js = `
(function(){
  var DATA = ${dataJson};

  var css = [
    '.rb-ao-container{font-family:Georgia,serif;padding:24px 0}',
    '.rb-ao-title{color:#d4af7f;font-size:1.5rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;font-weight:600;text-align:center}',
    '.rb-ao-subtitle{color:#d1d5db;font-size:1rem;text-align:center;margin-bottom:32px;line-height:1.6}',
    '.rb-ao-search-wrap{display:flex;justify-content:center;margin-bottom:40px}',
    '.rb-ao-search{width:100%;max-width:500px;padding:14px 20px;background:#fff;border:1px solid #d4af7f;color:#000;border-radius:8px;font-size:1.05rem;font-family:Georgia,serif}',
    '.rb-ao-search::placeholder{color:#999}',
    '.rb-ao-grid{display:grid;grid-template-columns:1fr;gap:28px;max-width:900px;margin:0 auto}',
    '.rb-ao-card{background:#0a0a0a;border:1px solid #d4af7f;border-radius:12px;overflow:hidden;transition:all .3s ease;display:grid;grid-template-columns:260px 1fr;gap:24px;padding:24px;text-decoration:none;color:inherit;align-items:center}',
    '.rb-ao-card:nth-child(even){grid-template-columns:1fr 260px}',
    '.rb-ao-card:nth-child(even) .rb-ao-img-wrap{order:2}',
    '.rb-ao-card:hover{border-color:#e8c99a;box-shadow:0 4px 20px rgba(212,175,127,.35);transform:translateY(-2px)}',
    '.rb-ao-card-content{display:flex;flex-direction:column;justify-content:flex-start}',
    '.rb-ao-card-name{color:#d4af7f;font-size:1.5rem;font-weight:600;margin-bottom:6px}',
    '.rb-ao-card-dates{color:#d1d5db;font-size:1rem;margin-bottom:8px}',
    '.rb-ao-card-location{color:#9ca3af;font-size:.95rem;margin-bottom:12px}',
    '.rb-ao-card-bio{color:#d1d5db;font-size:1rem;line-height:1.6;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:16px}',
    '.rb-ao-img-wrap{width:260px;height:260px;flex-shrink:0}',
    '.rb-ao-card-img{width:260px;height:260px;border-radius:8px;object-fit:cover;border:2px solid #d4af7f;display:block}',
    '.rb-ao-card-placeholder{width:260px;height:260px;border-radius:8px;border:2px solid #d4af7f;background:#1a1a1a;display:flex;align-items:center;justify-content:center;color:#d4af7f;font-size:3rem}',
    '.rb-ao-card-btn{display:inline-block;padding:11px 26px;background:transparent;color:#d4af7f;border:1px solid #d4af7f;border-radius:6px;font-size:1rem;font-weight:600;text-decoration:none;transition:all .2s;margin-top:auto}',
    '.rb-ao-card-btn:hover{background:#d4af7f;color:#000}',
    '.rb-ao-empty{text-align:center;padding:40px;color:#6b7280;font-size:1.1rem}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.getElementById('rb-ao-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'rb-ao-root';
    document.currentScript ? document.currentScript.parentNode.insertBefore(root, document.currentScript) : document.body.appendChild(root);
  }

  root.className = 'rb-ao-container';
  root.innerHTML = [
    '<div class="rb-ao-title">Obituaries</div>',
    '<div class="rb-ao-subtitle">Honoring Lives. Sharing Memories. Keeping Loved Ones Close<br>View recent obituaries, share condolences, and celebrate<br>the lives of those who will always be remembered.</div>',
    '<div class="rb-ao-search-wrap"><input type="text" id="rb-ao-search" class="rb-ao-search" placeholder="Search obituaries by name..." /></div>',
    '<div id="rb-ao-list" class="rb-ao-grid"></div>'
  ].join('');

  var allObituaries = DATA;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderList(items) {
    var list = document.getElementById('rb-ao-list');
    if (!list) return;
    if (!items || !items.length) {
      list.innerHTML = '<div class="rb-ao-empty">No obituaries found.</div>';
      return;
    }
    list.innerHTML = items.map(function(o) {
      var dates = [o.birthDate, o.deathDate].filter(Boolean).join(' \u2013 ');
      var excerpt = o.bio ? esc(o.bio.slice(0, 250)) + (o.bio.length > 250 ? '...' : '') : '';
      var href = o.url || '#';
      var imgHtml = o.images && o.images[0]
        ? '<img class="rb-ao-card-img" src="' + esc(o.images[0]) + '" alt="' + esc(o.fullName) + '">'
        : '<div class="rb-ao-card-placeholder">&#10013;</div>';
      return [
        '<a href="' + esc(href) + '" target="_top" class="rb-ao-card">',
          '<div class="rb-ao-card-content">',
            '<div class="rb-ao-card-name">' + esc(o.fullName) + '</div>',
            '<div class="rb-ao-card-dates">' + esc(dates) + '</div>',
            o.location ? '<div class="rb-ao-card-location">' + esc(o.location) + '</div>' : '',
            '<div class="rb-ao-card-bio">' + excerpt + '</div>',
            '<span class="rb-ao-card-btn">Visit Obituary</span>',
          '</div>',
          '<div class="rb-ao-img-wrap">' + imgHtml + '</div>',
        '</a>'
      ].join('');
    }).join('');
  }

  renderList(allObituaries);

  var searchEl = document.getElementById('rb-ao-search');
  if (searchEl) {
    searchEl.addEventListener('input', function() {
      var q = this.value.toLowerCase();
      var filtered = q
        ? allObituaries.filter(function(o) { return o.fullName.toLowerCase().indexOf(q) > -1; })
        : allObituaries;
      renderList(filtered);
    });
  }
})();
`;

    return res.status(200).send(js);
  } catch (error) {
    console.error('Embed ao.js error:', error);
    return res.status(200).send('console.error("RB: Failed to load obituaries - ' + error.message.replace(/'/g, '') + '");');
  }
}
