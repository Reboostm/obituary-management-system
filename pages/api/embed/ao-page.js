/**
 * All Obituaries Page — server-rendered HTML for iframe embedding.
 * URL: /api/embed/ao-page
 */
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
      });

    const cards = obituaries.length === 0
      ? '<div class="empty">No obituaries found.</div>'
      : obituaries.map(function(o, i) {
          const dates = [o.birthDate, o.deathDate].filter(Boolean).join(' \u2013 ');
          const excerpt = o.bio ? esc(o.bio.slice(0, 250)) + (o.bio.length > 250 ? '...' : '') : '';
          const href = esc(o.url || '#');
          const img = (o.images && o.images[0])
            ? '<img class="card-img" src="' + esc(o.images[0]) + '" alt="' + esc(o.fullName) + '">'
            : '<div class="card-placeholder">&#10013;</div>';
          const locationHtml = o.location ? '<div class="card-location">' + esc(o.location) + '</div>' : '';
          const contentHtml = '<div class="card-content">'
            + '<div class="card-name">' + esc(o.fullName) + '</div>'
            + '<div class="card-dates">' + esc(dates) + '</div>'
            + locationHtml
            + '<div class="card-bio">' + excerpt + '</div>'
            + '<span class="card-btn">Visit Obituary</span>'
            + '</div>';
          const imgHtml = '<div class="img-wrap">' + img + '</div>';
          // Consistent: image always left, content always right
          return '<a href="' + href + '" target="_top" class="card">' + imgHtml + contentHtml + '</a>';
        }).join('');

    const css = [
      '*{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:Georgia,serif;background:transparent;padding:0}',
      '.header-section{background:#0a0a0a;border:2px solid #d4af7f;border-radius:12px;padding:32px 28px;margin-bottom:60px;text-align:center}',
      '.title{color:#d4af7f;font-size:2.8rem;letter-spacing:.2em;text-transform:uppercase;margin-bottom:20px;font-weight:900}',
      '.subtitle{color:#d1d5db;font-size:1.15rem;text-align:center;margin-bottom:28px;line-height:1.8;font-weight:400}',
      '.search-wrap{display:flex;justify-content:center}',
      '.search{width:100%;max-width:500px;padding:14px 20px;background:#fff;border:2px solid #d4af7f;color:#000;border-radius:8px;font-size:1rem;font-family:Georgia,serif;outline:none}',
      '.search::placeholder{color:#888}',
      '.grid{display:grid;grid-template-columns:1fr;gap:24px;max-width:900px;margin:0 auto}',
      '.card{background:#0a0a0a;border:1px solid #d4af7f;border-radius:12px;overflow:hidden;transition:all .3s ease;display:grid;grid-template-columns:260px 1fr;gap:24px;padding:24px;text-decoration:none;color:inherit;align-items:start}',
      '.card:hover{border-color:#e8c99a;box-shadow:0 4px 20px rgba(212,175,127,.35);transform:translateY(-2px)}',
      '.card-content{display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-start}',
      '.card-name{color:#d4af7f;font-size:1.5rem;font-weight:600;margin-bottom:8px}',
      '.card-dates{color:#d1d5db;font-size:1rem;margin-bottom:6px;font-weight:500}',
      '.card-location{color:#9ca3af;font-size:.9rem;margin-bottom:12px}',
      '.card-bio{color:#d1d5db;font-size:.95rem;line-height:1.65;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:16px}',
      '.img-wrap{width:260px;height:280px;flex-shrink:0}',
      '.card-img{width:260px;height:280px;border-radius:8px;object-fit:cover;object-position:center;border:2px solid #d4af7f;display:block;background:#111}',
      '.card-placeholder{width:260px;height:280px;border-radius:8px;border:2px solid #d4af7f;background:#1a1a1a;display:flex;align-items:center;justify-content:center;color:#d4af7f;font-size:3rem}',
      '.card-btn{display:inline-block;padding:10px 24px;background:transparent;color:#d4af7f;border:1px solid #d4af7f;border-radius:6px;font-size:1rem;font-weight:600;text-decoration:none;transition:all .2s;align-self:flex-start;white-space:nowrap}',
      '.card-btn:hover{background:#d4af7f;color:#000}',
      '.empty{text-align:center;padding:40px;color:#6b7280;font-size:1.1rem}',
    ].join('');

    const html = '<!DOCTYPE html>\n'
      + '<html lang="en">\n'
      + '<head>\n'
      + '<meta charset="utf-8">\n'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
      + '<style>' + css + '</style>\n'
      + '</head>\n'
      + '<body>\n'
      + '<div class="header-section">\n'
      + '<div class="title">Obituaries</div>\n'
      + '<div class="subtitle">Honoring Lives. Sharing Memories. Keeping Loved Ones Close.<br>View recent obituaries, share condolences, and celebrate the lives of those who will always be remembered.</div>\n'
      + '<div class="search-wrap"><input type="text" id="search" class="search" placeholder="Search obituaries by name..." oninput="doSearch(this.value)" /></div>\n'
      + '</div>\n'
      + '<div id="grid" class="grid">' + cards + '</div>\n'
      + '<script>\n'
      + 'var items=Array.from(document.querySelectorAll(".card"));\n'
      + 'function doSearch(q){q=q.toLowerCase();items.forEach(function(c){var n=c.querySelector(".card-name");c.style.display=(!q||(n&&n.textContent.toLowerCase().indexOf(q)>-1))?"":"none";});}\n'
      + 'function notifyHeight(){var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight,document.body.offsetHeight,document.documentElement.offsetHeight);try{parent.postMessage({rbHeight:h},"*");}catch(e){}}\n'
      + 'notifyHeight();\n'
      + 'window.addEventListener("load",notifyHeight);\n'
      + 'window.addEventListener("resize",notifyHeight);\n'
      + '[100,300,600,1000,2000,3000].forEach(function(t){setTimeout(notifyHeight,t);});\n'
      + 'document.querySelectorAll("img").forEach(function(img){img.addEventListener("load",notifyHeight);});\n'
      + 'if(window.ResizeObserver){var ro=new ResizeObserver(notifyHeight);ro.observe(document.body);}\n'
      + '<\/script>\n'
      + '</body>\n'
      + '</html>';

    return res.status(200).send(html);
  } catch (error) {
    console.error('Embed ao-page error:', error);
    return res.status(500).send('<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#6b7280;padding:20px">Unable to load obituaries. Please refresh.</body></html>');
  }
}
