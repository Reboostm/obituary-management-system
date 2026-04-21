/**
 * Embeddable Obituary Card — returns a complete HTML page for iframe embedding.
 * URL: /api/embed/obituary/[id]
 * Usage: <iframe src="https://obituary-management-system.vercel.app/api/embed/obituary/ABC123" ...>
 */
import { db } from '../../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.removeHeader('X-Frame-Options');

  const { id } = req.query;

  if (!id) {
    return res.status(200).send(errorPage('Missing obituary ID'));
  }

  try {
    const docRef = doc(db, 'obituaries', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(200).send(errorPage('Obituary not found'));
    }

    const o = { id, ...docSnap.data() };

    if (o.status !== 'published') {
      return res.status(200).send(errorPage('Obituary is not published'));
    }

    const img = o.images && o.images[0]
      ? `<img class="rb-lp-img" src="${esc(o.images[0])}" alt="${esc(o.fullName)}">`
      : '<div class="rb-lp-placeholder">&#9671;</div>';
    const dates = [o.birthDate, o.deathDate].filter(Boolean).join(' – ');
    const excerpt = o.bio ? esc(o.bio.slice(0, 200)) + (o.bio.length > 200 ? '...' : '') : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:transparent}
.rb-lp-card{background:#1e1e2e;border:1px solid #374151;border-radius:12px;overflow:hidden;display:flex;gap:16px;padding:16px;transition:border-color .2s;max-width:640px}
.rb-lp-card:hover{border-color:#d97706}
.rb-lp-img{width:90px;height:90px;border-radius:10px;object-fit:cover;flex-shrink:0;border:2px solid #374151}
.rb-lp-placeholder{width:90px;height:90px;border-radius:10px;background:#374151;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#6b7280}
.rb-lp-body{flex:1;min-width:0}
.rb-lp-name{color:#fff;font-size:1.1rem;margin-bottom:4px}
.rb-lp-dates{color:#f59e0b;font-size:.82rem;margin-bottom:8px}
.rb-lp-excerpt{color:#9ca3af;font-size:.85rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rb-lp-loc{color:#6b7280;font-size:.78rem;margin-top:6px}
</style>
</head>
<body>
<div class="rb-lp-card">
  ${img}
  <div class="rb-lp-body">
    <div class="rb-lp-name">${esc(o.fullName)}</div>
    <div class="rb-lp-dates">${esc(dates)}</div>
    <div class="rb-lp-excerpt">${excerpt}</div>
    ${o.location ? `<div class="rb-lp-loc">📍 ${esc(o.location)}</div>` : ''}
  </div>
</div>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    console.error('Embed obituary error:', error);
    return res.status(200).send(errorPage('Unable to load obituary'));
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorPage(msg) {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Georgia,serif;background:transparent">
<p style="color:#6b7280;font-size:.85rem">${esc(msg)}</p>
</body></html>`;
}
