/**
 * Embeddable Home Page — returns a complete HTML page for iframe embedding.
 * URL: /api/embed/home
 * Usage: <iframe src="https://obituary-management-system.vercel.app/api/embed/home" ...>
 */
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  // Allow iframe embedding from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Remove X-Frame-Options to allow iframe embedding
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
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        fullName: o.fullName || '',
        birthDate: o.birthDate || '',
        deathDate: o.deathDate || '',
        images: o.images || [],
        url: o.url || '#',
      }));

    const cards = obituaries.length === 0
      ? '<div class="rb-hw-empty">No recent obituaries.</div>'
      : obituaries.map((o) => {
          const img = o.images && o.images[0]
            ? `<img class="rb-hw-img" src="${esc(o.images[0])}" alt="${esc(o.fullName)}">`
            : '<div class="rb-hw-placeholder">&#10013;</div>';
          const dates = [o.birthDate, o.deathDate].filter(Boolean).join(' – ');
          return `<a href="${esc(o.url)}" class="rb-hw-card" style="text-decoration:none;color:inherit">${img}<div class="rb-hw-content"><div><div class="rb-hw-name">${esc(o.fullName)}</div><div class="rb-hw-dates">${esc(dates)}</div></div><button class="rb-hw-btn" onclick="window.location.href='${esc(o.url)}';return false;">Read Obituary</button></div></a>`;
        }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:transparent}
.rb-hw{padding:24px 0}
.rb-hw-title{display:none}
.rb-hw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px}
.rb-hw-card{background:#0a0a0a;border:1px solid #d97706;border-radius:12px;overflow:hidden;transition:all .3s ease;text-decoration:none;color:inherit;display:flex;flex-direction:column;cursor:pointer}
.rb-hw-card:hover{border-color:#f59e0b;box-shadow:0 4px 20px rgba(217,119,6,0.3);transform:translateY(-2px)}
.rb-hw-img{width:100%;height:240px;object-fit:cover;display:block;background:#111}
.rb-hw-placeholder{width:100%;height:240px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:4rem;color:#d97706}
.rb-hw-content{padding:16px;flex:1;display:flex;flex-direction:column;justify-content:space-between}
.rb-hw-name{color:#f59e0b;font-size:1.1rem;font-weight:600;margin-bottom:8px;line-height:1.3}
.rb-hw-dates{color:#d1d5db;font-size:.85rem;margin-bottom:12px}
.rb-hw-btn{background:#d97706;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:.85rem;font-weight:600;cursor:pointer;margin-top:auto;transition:background .2s;font-family:inherit}
.rb-hw-btn:hover{background:#b45309}
.rb-hw-empty{color:#6b7280;font-size:.9rem;text-align:center;padding:32px}
</style>
</head>
<body>
<div class="rb-hw">
  <div class="rb-hw-grid">${cards}</div>
</div>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    console.error('Embed home error:', error);
    const html = `<!DOCTYPE html>
<html><body style="margin:0;font-family:Georgia,serif;background:transparent">
<p style="color:#6b7280;font-size:.9rem">Unable to load obituaries.</p>
</body></html>`;
    return res.status(200).send(html);
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
