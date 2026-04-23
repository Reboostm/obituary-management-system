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

    // Extract primary service for postMessage (prioritize Funeral Service)
    let primaryService = null;
    if (o.services && o.services.length > 0) {
      primaryService = o.services.find(s => s.type === 'Funeral Service') || o.services[0];
    }

    // Build service data for postMessage
    const serviceDate = primaryService?.date || '';
    const serviceTime = primaryService?.time || '';
    const serviceLocation = primaryService?.location || '';
    const serviceDateTime = serviceDate && serviceTime ? `${serviceDate} at ${serviceTime}` : (serviceDate || serviceTime || '');

    // Build rawServiceText as readable string (e.g., "Funeral Service – Saturday, April 12 at 2:00 PM – 123 Main St")
    let rawServiceText = '';
    if (primaryService) {
      const parts = [primaryService.type];
      if (serviceDate) parts.push(serviceDate);
      if (serviceTime) parts.push(`at ${serviceTime}`);
      if (serviceLocation) parts.push(serviceLocation);
      rawServiceText = parts.join(' – ');
    }

    // Data to send to parent page via postMessage
    const obituaryDataForPostMessage = {
      deceasedName: o.fullName || '',
      serviceDate: serviceDate,
      serviceTime: serviceTime,
      serviceDateTime: serviceDateTime,
      serviceLocation: serviceLocation,
      rawServiceText: rawServiceText
    };

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
          : (s.location ? `<a href="https://www.google.com/maps/search/${encodeURIComponent(s.location)}" target="_blank" rel="noopener noreferrer" class="rb-fp-service-loc" style="text-decoration:underline;cursor:pointer">📍 ${esc(s.location)}</a>` : '');
        return `<div class="rb-fp-service-card${isVirtualViewing ? ' rb-fp-service-card-virtual' : ''}"><div class="rb-fp-service-type">${esc(s.type)}</div><div class="rb-fp-service-datetime">${s.date ? esc(s.date) : ''}${s.time ? ' at ' + esc(s.time) : ''}</div>${locationOrLink}</div>`;
      }).join('');
      servicesHtml = `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Memorial Services</div><div class="rb-fp-section-line right"></div></div><div class="rb-fp-services">${sCards}</div>`;
    }

    // Build memories HTML
    const memoriesHtml = memories.length === 0
      ? '<p style="color:#8a7f6a;font-size:.85rem;text-align:center;padding:24px 0;font-style:italic;letter-spacing:.04em">No memories shared yet. Be the first to leave one above.</p>'
      : memories.map((m, idx) => {
          const mDate = m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

          // Special card for flower orders: image gallery + arrangement name + sender
          if (m.isFlowerOrder) {
            const senderName = m.name && m.name !== 'Flower Order' && m.name !== 'A caring friend' ? m.name : (m.customerName || 'A caring friend');
            const flowerName = m.flowerName || 'Flower Arrangement';
            const flowerRel = m.relationship && m.relationship !== 'Flower Order' ? m.relationship : '';
            const flowerImgs = Array.isArray(m.flowerImages) && m.flowerImages.length
              ? m.flowerImages
              : (m.flowerImage ? [m.flowerImage] : []);
            const galleryCls = flowerImgs.length > 1 ? 'rb-fp-flower-gallery multi' : 'rb-fp-flower-gallery single';
            const flowerImg  = flowerImgs.length
              ? `<div class="${galleryCls}">${flowerImgs.map(src => `<div class="rb-fp-flower-img"><img src="${esc(src)}" alt="${esc(flowerName)}"></div>`).join('')}</div>`
              : '';
            return `<div class="rb-fp-memory-card rb-fp-flower-card">`
              + `<div class="rb-fp-memory-header">`
                + `<div class="rb-fp-flower-sender">`
                  + `<div class="rb-fp-flower-sender-label">A tribute from</div>`
                  + `<div class="rb-fp-memory-name">${esc(senderName)}</div>`
                  + (flowerRel ? `<span class="rb-fp-flower-rel">${esc(flowerRel)}</span>` : '')
                + `</div>`
                + `<div style="display:flex;align-items:center;gap:8px">`
                  + `<span class="rb-fp-flower-badge">💐 Flowers</span>`
                  + `<button class="rb-fp-memory-share" data-sharer="${esc(senderName)}" title="Share">Share</button>`
                + `</div>`
              + `</div>`
              + flowerImg
              + `<div class="rb-fp-flower-name">${esc(flowerName)}</div>`
              + `<div class="rb-fp-flower-tribute-label">In loving memory of</div>`
              + `<div class="rb-fp-flower-deceased">${esc(m.deceasedName || o.fullName || '')}</div>`
              + (mDate ? `<div class="rb-fp-memory-date">${esc(mDate)}</div>` : '')
            + `</div>`;
          }

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
.rb-fp-header{background:radial-gradient(ellipse at top,#1a1528 0%,#0f0b18 55%,#080510 100%);border-radius:16px 16px 0 0;padding:56px 32px 200px;text-align:center;border-bottom:1px solid rgba(212,175,127,.22);position:relative;overflow:hidden}
.rb-fp-header::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,127,.45) 50%,transparent)}
.rb-fp-header::after{content:"";position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:70%;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,127,.35) 50%,transparent)}
.rb-fp-deco{display:flex;align-items:center;justify-content:center;gap:14px;margin:0 auto 18px;max-width:260px}
.rb-fp-deco-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,127,.55))}
.rb-fp-deco-line.right{background:linear-gradient(90deg,rgba(212,175,127,.55),transparent)}
.rb-fp-deco-diamond{color:#d4af7f;font-size:.75rem;letter-spacing:.2em;filter:drop-shadow(0 0 6px rgba(212,175,127,.4))}
.rb-fp-mem-label{color:#d4af7f;font-size:.72rem;letter-spacing:.32em;text-transform:uppercase;font-weight:500;margin-bottom:14px;font-family:'Helvetica Neue',Arial,sans-serif;opacity:.85}
.rb-fp-name{color:#f5e9d4;font-size:2.6rem;margin:0 0 14px;letter-spacing:.015em;font-family:Georgia,'Times New Roman',serif;font-weight:500;line-height:1.1;text-shadow:0 2px 18px rgba(212,175,127,.18)}
.rb-fp-dates{color:#d4af7f;font-size:.95rem;letter-spacing:.18em;font-family:Georgia,serif;font-style:italic;margin-top:4px}
.rb-fp-dates .sep{display:inline-block;margin:0 10px;color:#8a7f6a;font-style:normal}
.rb-fp-loc{color:#9a8f7a;font-size:.82rem;margin-top:12px;font-style:italic;letter-spacing:.06em;font-family:Georgia,serif}
.rb-fp-loc::before{content:"◆ ";color:#8a7f6a;font-size:.55rem;vertical-align:middle;margin-right:4px}
.rb-fp-body{background:#f9fafb;padding:0 32px 32px;border-radius:0 0 16px 16px;display:flow-root}
.rb-fp-carousel{position:relative;margin:-150px auto 32px;border-radius:50%;overflow:hidden;width:300px;height:300px;border:3px solid transparent;background:linear-gradient(#f9fafb,#f9fafb) padding-box,linear-gradient(135deg,#d4af7f 0%,#b8935c 50%,#d4af7f 100%) border-box;box-shadow:0 16px 42px rgba(0,0,0,.45)}
.rb-fp-carousel-track{display:flex;transition:transform .4s ease;height:100%}
.rb-fp-carousel-slide{min-width:100%;height:100%;background:#111827}
.rb-fp-carousel-slide img{width:100%;height:100%;object-fit:cover}
.rb-fp-carousel-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.5);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem}
.rb-fp-carousel-btn.prev{left:8px}.rb-fp-carousel-btn.next{right:8px}
.rb-fp-carousel-dots{text-align:center;margin-top:8px}
.rb-fp-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d1d5db;margin:0 3px;cursor:pointer;transition:background .2s}
.rb-fp-dot.active{background:#d97706}
.rb-fp-section-header{display:flex;align-items:center;gap:14px;margin:32px 0 16px}
.rb-fp-section-line{height:1px;flex:1;background:linear-gradient(90deg,transparent,rgba(184,147,92,.35))}
.rb-fp-section-line.right{background:linear-gradient(90deg,rgba(184,147,92,.35),transparent)}
.rb-fp-section-title{color:#b8935c;font-size:1rem;font-weight:600;text-transform:uppercase;letter-spacing:.28em;white-space:nowrap;font-family:Georgia,serif}
.rb-fp-text{color:#374151;font-size:1rem;line-height:1.75}
.rb-fp-services{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:8px}
.rb-fp-service-card{background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px}
.rb-fp-service-type{color:#92400e;font-size:1rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
.rb-fp-service-datetime{color:#1f2937;font-size:.9rem;font-weight:600}
.rb-fp-service-loc{color:#4b5563;font-size:.82rem;margin-top:2px}
.rb-fp-service-card-virtual{background:#d4af7f;border:2px solid #f59e0b}
.rb-fp-virtual-link{display:inline-block;background:#d97706;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:.85rem;font-weight:600;margin-top:8px;transition:all .2s;border:none;cursor:pointer}
.rb-fp-virtual-link:hover{background:#b45309;transform:scale(1.05)}
.rb-fp-mw{margin-top:-16px;background:linear-gradient(180deg,#0a0a0f 0%,#12101a 100%);border-radius:0;padding:48px 32px 56px;border:none;border-top:1px solid rgba(212,175,127,.2);box-shadow:none}
.rb-fp-mw-head{text-align:center;margin-bottom:28px}
.rb-fp-mw-divider-top{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px}
.rb-fp-mw-divider-top span{display:inline-block;width:60px;height:1px;background:linear-gradient(90deg,transparent,#c9a96e 50%,transparent)}
.rb-fp-mw-divider-top .dot{width:6px;height:6px;border-radius:50%;background:#c9a96e;box-shadow:0 0 10px rgba(212,175,127,.5)}
.rb-fp-mw-title{color:#d4af7f;font-size:1.7rem;font-weight:600;letter-spacing:.32em;text-transform:uppercase;margin:0;text-align:center;font-family:Georgia,serif;text-shadow:0 2px 14px rgba(212,175,127,.15)}
.rb-fp-mw-sub{color:#8a7f6a;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;margin-top:10px;font-weight:500}

/* Collapsible Leave-a-Memory toggle */
.rb-fp-leave{max-width:560px;margin:0 auto 36px;background:linear-gradient(135deg,rgba(212,175,127,.08) 0%,rgba(201,169,110,.04) 100%);border:1px solid rgba(212,175,127,.28);border-radius:12px;overflow:hidden;transition:border-color .25s,box-shadow .25s}
.rb-fp-leave.open{border-color:rgba(212,175,127,.5);box-shadow:0 8px 28px rgba(0,0,0,.35),0 0 0 1px rgba(212,175,127,.1)}
.rb-fp-leave-toggle{width:100%;background:transparent;border:none;color:#e8dcc4;padding:18px 22px;font-size:.95rem;font-family:Georgia,serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:14px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;transition:color .2s}
.rb-fp-leave-toggle:hover{color:#f3c071}
.rb-fp-leave-toggle .plus{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#e8c492 0%,#c9a96e 50%,#b8935c 100%);color:#1a1208;font-weight:900;font-size:1.75rem;line-height:1;transition:transform .3s ease,box-shadow .3s ease;box-shadow:0 3px 14px rgba(212,175,127,.45),inset 0 1px 0 rgba(255,255,255,.35);animation:rb-plus-pulse 2.6s ease-in-out infinite}
.rb-fp-leave.open .rb-fp-leave-toggle .plus{transform:rotate(45deg);animation:none}
@keyframes rb-plus-pulse{
  0%,100%{box-shadow:0 3px 14px rgba(212,175,127,.45),inset 0 1px 0 rgba(255,255,255,.35),0 0 0 0 rgba(212,175,127,.5)}
  50%{box-shadow:0 3px 14px rgba(212,175,127,.55),inset 0 1px 0 rgba(255,255,255,.35),0 0 0 10px rgba(212,175,127,0)}
}
.rb-fp-leave-toggle:hover .plus{transform:scale(1.08);box-shadow:0 5px 18px rgba(212,175,127,.6),inset 0 1px 0 rgba(255,255,255,.4)}
.rb-fp-leave.open .rb-fp-leave-toggle:hover .plus{transform:rotate(45deg) scale(1.08)}
.rb-fp-leave-panel{max-height:0;overflow:hidden;transition:max-height .4s ease}
.rb-fp-leave.open .rb-fp-leave-panel{max-height:2000px}
.rb-fp-leave-inner{padding:4px 22px 22px;border-top:1px solid rgba(212,175,127,.18)}

.rb-fp-memory-card{background:linear-gradient(135deg,#141018 0%,#1a141e 100%);border:1px solid rgba(212,175,127,.3);border-radius:14px;padding:22px;margin-bottom:18px;transition:all .3s ease;box-shadow:0 4px 16px rgba(0,0,0,.3),inset 0 1px 0 rgba(212,175,127,.05)}
.rb-fp-memory-card:hover{border-color:rgba(243,192,113,.55);box-shadow:0 10px 28px rgba(212,175,127,.18),inset 0 1px 0 rgba(243,192,113,.1);transform:translateY(-2px)}
.rb-fp-memory-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.rb-fp-memory-name{color:#f3c071;font-size:1.35rem;font-weight:500;letter-spacing:.02em;font-family:Georgia,serif}
.rb-fp-memory-rel{font-size:.68rem;color:#e8dcc4;background:linear-gradient(135deg,rgba(212,175,127,.18) 0%,rgba(201,169,110,.1) 100%);padding:5px 12px;border-radius:999px;border:1px solid rgba(212,175,127,.35);font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.rb-fp-memory-text{color:#e5e7eb;font-size:.9rem;line-height:1.8;margin:12px 0}
.rb-fp-memory-date{color:#9ca3af;font-size:.8rem;margin-top:12px;font-style:italic}
.rb-fp-memory-images{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin:16px 0}
.rb-fp-memory-image{width:100%;aspect-ratio:1;border-radius:6px;border:1px solid #374151;overflow:hidden;cursor:pointer;transition:transform .2s}
.rb-fp-memory-image:hover{transform:scale(1.05)}
.rb-fp-memory-image img{width:100%;height:100%;object-fit:cover;cursor:pointer}
.rb-fp-flower-card{background:linear-gradient(160deg,#1a1208 0%,#241810 50%,#1f1410 100%);border:1px solid rgba(212,175,127,.35);box-shadow:0 4px 20px rgba(0,0,0,.25),inset 0 1px 0 rgba(243,192,113,.08);padding:22px}
.rb-fp-flower-card:hover{border-color:rgba(243,192,113,.6);box-shadow:0 8px 28px rgba(212,175,127,.2),inset 0 1px 0 rgba(243,192,113,.12);transform:translateY(-2px)}
.rb-fp-flower-sender{display:flex;flex-direction:column;gap:3px}
.rb-fp-flower-sender-label{color:#d4af7f;font-size:.68rem;text-transform:uppercase;letter-spacing:.18em;font-weight:600;opacity:.85}
.rb-fp-flower-rel{display:inline-block;margin-top:4px;font-size:.62rem;color:#e8dcc4;background:linear-gradient(135deg,rgba(212,175,127,.18) 0%,rgba(201,169,110,.1) 100%);padding:3px 10px;border-radius:999px;border:1px solid rgba(212,175,127,.35);font-weight:600;letter-spacing:.14em;text-transform:uppercase;align-self:flex-start;font-family:'Helvetica Neue',Arial,sans-serif}
.rb-fp-flower-card .rb-fp-memory-name{color:#f3c071;font-size:1.35rem;font-family:Georgia,serif;font-weight:500;letter-spacing:.02em}
.rb-fp-flower-badge{font-size:.68rem;color:#fef3cd;background:linear-gradient(135deg,rgba(217,119,6,.3) 0%,rgba(184,147,92,.3) 100%);padding:5px 11px;border-radius:999px;border:1px solid rgba(243,192,113,.45);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.rb-fp-flower-gallery{display:grid;gap:10px;margin:16px 0 8px}
.rb-fp-flower-gallery.single{grid-template-columns:1fr;max-width:340px;margin-left:auto;margin-right:auto}
.rb-fp-flower-gallery.multi{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.rb-fp-flower-img{border-radius:12px;overflow:hidden;border:1px solid rgba(212,175,127,.35);background:#0d0a06;box-shadow:0 2px 8px rgba(0,0,0,.3);aspect-ratio:1;position:relative}
.rb-fp-flower-gallery.single .rb-fp-flower-img{aspect-ratio:auto}
.rb-fp-flower-img img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
.rb-fp-flower-card:hover .rb-fp-flower-img img{transform:scale(1.03)}
.rb-fp-flower-name{color:#e8dcc4;font-size:1rem;font-weight:500;margin:14px 0 14px;letter-spacing:.01em;line-height:1.4;font-family:Georgia,serif}
.rb-fp-flower-tribute-label{color:#9a8f7a;font-size:.72rem;text-transform:uppercase;letter-spacing:.15em;font-weight:500;margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif}
.rb-fp-flower-deceased{color:#f3c071;font-size:1.75rem;font-style:italic;font-weight:600;line-height:1.25;margin:0 0 6px;font-family:Georgia,'Times New Roman',serif}
.rb-fp-form{background:transparent;border:none;border-radius:0;padding:0;margin-top:14px}
.rb-fp-form-title{color:#d4af7f;font-size:.72rem;margin-bottom:14px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;text-align:center}
.rb-fp-field{margin-bottom:14px}
.rb-fp-label{display:block;color:#9a8f7a;font-size:.72rem;margin-bottom:6px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif}
.rb-fp-input,.rb-fp-select,.rb-fp-textarea{width:100%;background:rgba(20,16,24,.65);border:1px solid rgba(212,175,127,.25);color:#f3ede0;border-radius:8px;padding:11px 14px;font-size:.9rem;box-sizing:border-box;font-family:Georgia,serif;transition:border-color .2s,box-shadow .2s,background .2s}
.rb-fp-select,select.rb-fp-input{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%3E%3Cpath%20fill%3D%22%23d4af7f%22%20d%3D%22M0%200l5%206%205-6z%22%2F%3E%3C%2Fsvg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;cursor:pointer}
.rb-fp-select option,select.rb-fp-input option{background:#14101a;color:#f3ede0}
.rb-fp-textarea{resize:vertical;min-height:110px;line-height:1.55}
.rb-fp-input::placeholder,.rb-fp-textarea::placeholder{color:#6b6254}
.rb-fp-input:focus,.rb-fp-select:focus,.rb-fp-textarea:focus{outline:none;border-color:#d4af7f;box-shadow:0 0 0 3px rgba(212,175,127,.15);background:rgba(20,16,24,.9)}
.rb-fp-submit{background:linear-gradient(135deg,#d4af7f 0%,#b8935c 100%);color:#1a1208;border:none;border-radius:8px;padding:13px 28px;font-size:.85rem;letter-spacing:.18em;text-transform:uppercase;font-weight:700;cursor:pointer;font-family:'Helvetica Neue',Arial,sans-serif;transition:transform .12s,box-shadow .2s,filter .2s;box-shadow:0 3px 12px rgba(212,175,127,.3);width:100%;margin-top:4px}
.rb-fp-submit:hover{filter:brightness(1.06);transform:translateY(-1px);box-shadow:0 6px 18px rgba(212,175,127,.45)}
.rb-fp-submit:active{transform:translateY(0)}
.rb-fp-submit:disabled{opacity:.6;cursor:default;transform:none;filter:none}
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
.rb-fp-header{padding:40px 20px 36px}
.rb-fp-name{font-size:2rem}
.rb-fp-mem-label{font-size:.66rem;letter-spacing:.28em}
.rb-fp-body{padding:0 20px 20px}
.rb-fp-header{padding:40px 20px 160px}
.rb-fp-carousel{margin-top:-125px;width:240px;height:240px}
.rb-fp-section-header{flex-wrap:wrap;justify-content:center;white-space:normal;margin:20px 0 16px}
.rb-fp-section-line{display:none}
.rb-fp-section-title{font-size:.88rem;margin-bottom:8px;width:100%;letter-spacing:.22em}
.rb-fp-services{grid-template-columns:1fr}
.rb-fp-share-section{margin:0;padding:24px 20px;background:#000}
.rb-fp-share-buttons{justify-content:center}
.rb-fp-share-btn{min-width:90px;padding:12px 16px;font-size:.8rem}}
</style>
</head>
<body>
<script>
// Embed obituary data for postMessage to parent page
window.__obituaryData = ${JSON.stringify(obituaryDataForPostMessage)};
console.log('OBITUARY DATA EMBEDDED:', window.__obituaryData);
</script>
<div class="rb-fp">
  <div class="rb-fp-header">
    <div class="rb-fp-deco"><div class="rb-fp-deco-line"></div><span class="rb-fp-deco-diamond">◆</span><div class="rb-fp-deco-line right"></div></div>
    <div class="rb-fp-mem-label">In Loving Memory Of</div>
    <h1 class="rb-fp-name">${esc(o.fullName)}</h1>
    ${o.birthDate || o.deathDate ? `<div class="rb-fp-dates">${esc(o.birthDate || '')}${o.birthDate && o.deathDate ? '<span class="sep">—</span>' : ''}${esc(o.deathDate || '')}</div>` : ''}
    ${o.location ? `<div class="rb-fp-loc">${esc(o.location)}</div>` : ''}
  </div>
  <div class="rb-fp-body">
    ${carouselHtml}
    ${o.bio ? `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Life &amp; Legacy</div><div class="rb-fp-section-line right"></div></div><div class="rb-fp-text">${esc(o.bio).replace(/\n/g, '<br>')}</div>` : ''}
    ${o.survivors ? `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Survived By</div><div class="rb-fp-section-line right"></div></div><div class="rb-fp-text">${esc(o.survivors)}</div>` : ''}
    ${o.predeceased ? `<div class="rb-fp-section-header"><div class="rb-fp-section-line"></div><div class="rb-fp-section-title">Preceded in Death By</div><div class="rb-fp-section-line right"></div></div><div class="rb-fp-text">${esc(o.predeceased)}</div>` : ''}
    ${servicesHtml}
    <div class="rb-fp-share-section"><div style="text-align:center;margin-bottom:12px"><div class="rb-fp-section-title">Share This Tribute</div></div><div class="rb-fp-share-buttons"><button class="rb-fp-share-btn" data-platform="facebook" title="Share on Facebook">Facebook</button><button class="rb-fp-share-btn" data-platform="twitter" title="Share on Twitter">Twitter</button><button class="rb-fp-share-btn" data-platform="email" title="Share via Email">Email</button><button class="rb-fp-share-btn" data-platform="copy" title="Copy Link">Copy Link</button></div></div>
  </div>
  <div class="rb-fp-mw">
    <div class="rb-fp-mw-head">
      <div class="rb-fp-mw-divider-top"><span></span><div class="dot"></div><span></span></div>
      <div class="rb-fp-mw-title">Memory Wall</div>
      <div class="rb-fp-mw-sub">In Honor &amp; Remembrance</div>
    </div>

    <div class="rb-fp-leave" id="rb-leave">
      <button type="button" class="rb-fp-leave-toggle" id="rb-leave-toggle">
        <span class="plus">+</span>
        <span>Share a Memory</span>
      </button>
      <div class="rb-fp-leave-panel">
        <div class="rb-fp-leave-inner">
          <div class="rb-fp-form">
            <div class="rb-fp-field"><label class="rb-fp-label">Your Name</label><input class="rb-fp-input" id="rb-mname" placeholder="Jane Smith"></div>
            <div class="rb-fp-field"><label class="rb-fp-label">Relationship</label><select class="rb-fp-select rb-fp-input" id="rb-mrel"><option>Family</option><option>Friend</option><option>Neighbor</option><option>Co-worker</option><option>Classmate</option><option>Community member</option><option>Other</option></select></div>
            <div class="rb-fp-field"><label class="rb-fp-label">Your Memory</label><textarea class="rb-fp-textarea" id="rb-mtext" placeholder="Share a favorite memory..."></textarea></div>
            <div class="rb-fp-field"><label class="rb-fp-label">Photos (Optional) &middot; <span id="rb-photo-count">0/10 photos</span></label><input type="file" class="rb-fp-input" id="rb-mphoto" accept="image/*" style="padding:8px"></div>
            <button type="button" id="rb-add-photo-btn" style="background:transparent;color:#d4af7f;border:1px solid rgba(212,175,127,.4);border-radius:6px;padding:8px 16px;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;cursor:pointer;margin-bottom:14px;font-family:'Helvetica Neue',Arial,sans-serif;transition:all .2s">+ Add Another Photo</button>
            <div id="rb-mphoto-preview" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:14px"></div>
            <button class="rb-fp-submit" id="rb-msubmit">Share Memory</button>
            <div id="rb-mmsg"></div>
          </div>
        </div>
      </div>
    </div>

    <div id="rb-memories">${memoriesHtml}</div>
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

  /* ---- Leave-a-Memory collapsible toggle ---- */
  var leaveWrap = document.getElementById('rb-leave');
  var leaveToggle = document.getElementById('rb-leave-toggle');
  if (leaveWrap && leaveToggle) {
    leaveToggle.addEventListener('click', function() {
      leaveWrap.classList.toggle('open');
      setTimeout(notifyHeight, 450);
    });
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
          setTimeout(function() {
            msgEl.innerHTML = '';
            var lw = document.getElementById('rb-leave');
            if (lw) lw.classList.remove('open');
            setTimeout(notifyHeight, 450);
          }, 2200);
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
          el.innerHTML = '<p style="color:#8a7f6a;font-size:.85rem;text-align:center;padding:24px 0;font-style:italic;letter-spacing:.04em">No memories shared yet. Be the first to leave one above.</p>';
          notifyHeight();
          return;
        }
        el.innerHTML = memories.map(function(m) {
          var d = m.createdAt ? new Date(m.createdAt.seconds ? m.createdAt.seconds * 1000 : m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          if (m.isFlowerOrder) {
            var senderName = (m.name && m.name !== 'Flower Order' && m.name !== 'A caring friend') ? m.name : (m.customerName || 'A caring friend');
            var flowerName = m.flowerName || 'Flower Arrangement';
            var flowerRel = (m.relationship && m.relationship !== 'Flower Order') ? m.relationship : '';
            var imgs = (m.flowerImages && m.flowerImages.length) ? m.flowerImages : (m.flowerImage ? [m.flowerImage] : []);
            var galleryCls = imgs.length > 1 ? 'rb-fp-flower-gallery multi' : 'rb-fp-flower-gallery single';
            var imgHtml = imgs.length
              ? '<div class="' + galleryCls + '">' + imgs.map(function(src){ return '<div class="rb-fp-flower-img"><img src="' + escJs(src) + '" alt="' + escJs(flowerName) + '"></div>'; }).join('') + '</div>'
              : '';
            return '<div class="rb-fp-memory-card rb-fp-flower-card">'
              + '<div class="rb-fp-memory-header">'
                + '<div class="rb-fp-flower-sender"><div class="rb-fp-flower-sender-label">A tribute from</div><div class="rb-fp-memory-name">' + escJs(senderName) + '</div>'
                  + (flowerRel ? '<span class="rb-fp-flower-rel">' + escJs(flowerRel) + '</span>' : '')
                + '</div>'
                + '<div style="display:flex;align-items:center;gap:8px"><span class="rb-fp-flower-badge">💐 Flowers</span>'
                + '<button class="rb-fp-memory-share" data-sharer="' + escJs(senderName) + '" title="Share">Share</button></div>'
              + '</div>'
              + imgHtml
              + '<div class="rb-fp-flower-name">' + escJs(flowerName) + '</div>'
              + '<div class="rb-fp-flower-tribute-label">In loving memory of</div>'
              + '<div class="rb-fp-flower-deceased">' + escJs(m.deceasedName || shareData.name || '') + '</div>'
              + (d ? '<div class="rb-fp-memory-date">' + d + '</div>' : '')
              + '</div>';
          }
          return '<div class="rb-fp-memory-card"><div class="rb-fp-memory-header"><span class="rb-fp-memory-name">' + escJs(m.name) + '</span><div style="display:flex;align-items:center;gap:8px"><span class="rb-fp-memory-rel">' + escJs(m.relationship) + '</span><button class="rb-fp-memory-share" data-sharer="' + escJs(m.name) + '" title="Share this memory">Share</button></div></div><div class="rb-fp-memory-text">' + escJs(m.memoryText) + '</div>' + (m.photos && m.photos.length > 0 ? '<div class="rb-fp-memory-images">' + m.photos.map(function(p) { var esc_p = p.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return '<div class="rb-fp-memory-image" data-img="' + esc_p + '"><img src="' + esc_p + '" alt="Memory photo"></div>'; }).join('') + '</div>' : '') + (d ? '<div class="rb-fp-memory-date">' + d + '</div>' : '') + '</div>';
        }).join('');
        // Re-attach share button listeners will be done after rbShare function is defined
        setTimeout(notifyHeight, 100);
        document.querySelectorAll('#rb-memories img').forEach(function(img) { img.addEventListener('load', notifyHeight); });
      });
  }

  function escJs(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* All photos displayed in grid - no rotation */


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

  /* ---- Send Obituary Data to Parent Page ---- */
  window.addEventListener('load', function() {
    console.log('WINDOW LOAD EVENT FIRED');
    if (window.__obituaryData) {
      console.log('SENDING OBIT DATA:', window.__obituaryData);
      // Try window.top first (for nested iframes)
      try {
        window.top.postMessage({
          type: 'rbObituaryData',
          payload: window.__obituaryData
        }, 'https://didericksenmemorialfuneralservices.com');
        console.log('POSTMESSAGE SENT TO WINDOW.TOP');
      } catch(e) {
        console.error('WINDOW.TOP ERROR:', e);
      }
      // Fallback to parent
      try {
        window.parent.postMessage({
          type: 'rbObituaryData',
          payload: window.__obituaryData
        }, 'https://didericksenmemorialfuneralservices.com');
        console.log('POSTMESSAGE SENT TO WINDOW.PARENT');
      } catch(e) {
        console.error('WINDOW.PARENT ERROR:', e);
      }
    } else {
      console.warn('NO OBITUARY DATA TO SEND');
    }
  });
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
