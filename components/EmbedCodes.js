import { useState } from 'react';

const API_BASE = 'https://obituary-management-system.vercel.app';

// Firebase COMPAT SDK — works reliably in all environments including GHL
const FB_SDK_APP = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
const FB_SDK_FS  = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js';

// Firebase config is safe to embed client-side (Firestore security rules control access)
const FB_CFG = `{apiKey:"AIzaSyBW2HGnAg4bfxsu0s3D_Zh0WdUNmTXtKBI",authDomain:"obituary-management-system.firebaseapp.com",projectId:"obituary-management-system",storageBucket:"obituary-management-system.firebasestorage.app",messagingSenderId:"5807760058",appId:"1:5807760058:web:1add160f2d323d3f761883"}`;

// Shared helpers injected into every embed script
const HELPERS = `
  function rbEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function rbDate(ts){if(!ts)return '';var d=ts.toDate?ts.toDate():new Date(ts.seconds?ts.seconds*1000:ts);return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
  function rbDb(){if(!firebase.apps.length){firebase.initializeApp(${FB_CFG});}return firebase.firestore();}
`;

// ─── 1. HOME PAGE WIDGET ─────────────────────────────────────────────────────
function homePageCode() {
  return `<!-- ReBoost Marketing – Recent Obituaries Widget -->
<!-- Paste ONCE into a Custom HTML block on your homepage. Auto-updates. -->
<style>
.rb-hw{font-family:Georgia,serif;padding:24px 0}
.rb-hw-title{color:#f59e0b;font-size:1.35rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px;font-weight:600}
.rb-ao-container{font-family:Georgia,serif;padding:24px 0}
.rb-ao-title{color:#f59e0b;font-size:1.35rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:20px;font-weight:600}
.rb-ao-search{width:100%;max-width:400px;padding:12px 16px;background:#1e1e2e;border:1px solid #374151;color:#fff;border-radius:8px;margin-bottom:24px;font-size:1rem}
.rb-ao-search::placeholder{color:#6b7280}
.rb-ao-grid{display:grid;grid-template-columns:1fr;gap:20px}
.rb-ao-card{background:#1e1e2e;border:1px solid #374151;border-radius:12px;overflow:hidden;transition:border-color .2s;display:grid;grid-template-columns:1fr 200px;gap:20px;padding:20px;cursor:pointer;text-decoration:none;color:inherit}
.rb-ao-card:nth-child(odd) .rb-ao-card-img{order:2}
.rb-ao-card:hover{border-color:#d97706}
.rb-ao-card-content{display:flex;flex-direction:column;justify-content:center}
.rb-ao-card-name{color:#fff;font-size:1.35rem;font-weight:600;margin-bottom:8px}
.rb-ao-card-dates{color:#f59e0b;font-size:1.06rem;font-weight:500;margin-bottom:12px}
.rb-ao-card-bio{color:#9ca3af;font-size:1.09rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px}
.rb-ao-card-img{width:200px;height:200px;border-radius:8px;object-fit:cover;border:2px solid #374151}
.rb-ao-card-btn{display:inline-block;padding:10px 24px;background:#d97706;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.95rem;font-weight:600;transition:background .2s;text-decoration:none}
.rb-ao-card-btn:hover{background:#b45309}
.rb-ao-empty{text-align:center;padding:40px;color:#6b7280;font-size:1.1rem}
.rb-hw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px}
.rb-hw-card{background:#0a0a0a;border:1px solid #d4af7f;border-radius:12px;overflow:hidden;transition:all .3s ease;text-decoration:none;color:inherit;display:flex;flex-direction:column;cursor:pointer}
.rb-hw-card:hover{border-color:#e8c99a;box-shadow:0 4px 20px rgba(212,175,127,.35);transform:translateY(-2px)}
.rb-hw-img{width:100%;height:240px;object-fit:cover;object-position:center top;display:block;background:#111;flex-shrink:0}
.rb-hw-placeholder{width:100%;height:240px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:4rem;color:#d4af7f;flex-shrink:0}
.rb-hw-content{padding:16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.rb-hw-name{color:#d4af7f;font-size:1.4rem;margin-bottom:8px;font-weight:600;line-height:1.3}
.rb-hw-dates{color:#d1d5db;font-size:1rem;margin-bottom:14px}
.rb-hw-btn{background:transparent;color:#d4af7f;border:1px solid #d4af7f;border-radius:6px;padding:10px 16px;font-size:1.1rem;font-weight:600;cursor:pointer;margin-top:auto;transition:all .2s;font-family:inherit;width:100%;letter-spacing:.03em}
.rb-hw-btn:hover{background:#d4af7f;color:#000}
.rb-hw-msg{color:#6b7280;font-size:.9rem;text-align:center;padding:32px}
</style>
<div class="rb-hw">
  <div id="rb-hw-grid" class="rb-hw-grid"><div class="rb-hw-msg">Loading...</div></div>
</div>
<script src="${FB_SDK_APP}"></script>
<script src="${FB_SDK_FS}"></script>
<script>
(function(){
'use strict';
${HELPERS}
function render(){
  var grid=document.getElementById('rb-hw-grid');
  if(!grid){console.error('RB: #rb-hw-grid not found');return;}
  var db=rbDb();
  db.collection('obituaries').where('status','==','published').orderBy('createdAt','desc').limit(3).get()
    .then(function(snap){
      if(snap.empty){grid.innerHTML='<div class="rb-hw-msg">No recent obituaries.</div>';return;}
      grid.innerHTML=snap.docs.map(function(d){
        var o=d.data();
        var img=o.images&&o.images[0]
          ?'<img class="rb-hw-img" src="'+rbEsc(o.images[0])+'" alt="'+rbEsc(o.fullName)+'">'
          :'<div class="rb-hw-placeholder">&#10013;</div>';
        var dates=[o.birthDate,o.deathDate].filter(Boolean).join(' \u2013 ');
        var rawUrl=o.url||'#';
        var href=rawUrl;
        if(rawUrl!=='#'){if(!rawUrl.startsWith('http://'))href='https://'+rawUrl;href=href.replace(/\/obituaries\/([^/]+)$/,'/obituaries-$1');}
        return '<a href="'+rbEsc(href)+'" class="rb-hw-card" style="text-decoration:none">'+img+'<div class="rb-hw-content"><div><div class="rb-hw-name">'+rbEsc(o.fullName)+'</div><div class="rb-hw-dates">'+rbEsc(dates)+'</div></div><button class="rb-hw-btn">Read Obituary</button></div></a>';
      }).join('');
    })
    .catch(function(err){
      console.error('RB home error:',err.code,err.message);
      var grid=document.getElementById('rb-hw-grid');
      if(grid)grid.innerHTML='<div class="rb-hw-msg">Unable to load. Please refresh.</div>';
    });
}
function tryRender(n){
  if(typeof firebase!=='undefined'&&typeof firebase.firestore==='function'){render();}
  else if(n>0){setTimeout(function(){tryRender(n-1);},300);}
  else{console.error('RB: Firebase SDK failed to load');}
}
if(document.readyState==='complete'||document.readyState==='interactive'){setTimeout(function(){tryRender(15);},100);}
else{document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){tryRender(15);},100);});}
})();
</script>`;
}

// ─── 2. LISTING PAGE CARD ────────────────────────────────────────────────────
function listingPageCode(id, fullName) {
  const rootId = 'rb-lp-' + id;
  return `<!-- ReBoost Marketing – Obituary Card: ${fullName} -->
<!-- Paste into a Custom HTML block on your obituaries listing page. -->
<style>
#${rootId}{font-family:Georgia,serif}
.rb-lp-card{background:#1e1e2e;border:1px solid #374151;border-radius:12px;display:flex;gap:16px;padding:16px;max-width:640px;transition:border-color .2s;cursor:pointer;text-decoration:none;color:inherit}
.rb-lp-card:hover{border-color:#d97706}
.rb-lp-img{width:90px;height:90px;border-radius:10px;object-fit:cover;flex-shrink:0;border:2px solid #374151}
.rb-lp-placeholder{width:90px;height:90px;border-radius:10px;background:#374151;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#6b7280}
.rb-lp-body{flex:1;min-width:0}
.rb-lp-name{color:#fff;font-size:1.35rem;margin-bottom:4px;font-weight:600}
.rb-lp-dates{color:#f59e0b;font-size:1.06rem;margin-bottom:8px;font-weight:500}
.rb-lp-excerpt{color:#9ca3af;font-size:1.09rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rb-lp-loc{color:#6b7280;font-size:1.02rem;margin-top:6px}
</style>
<div id="${rootId}"><div style="color:#9ca3af;font-size:.85rem">Loading...</div></div>
<script src="${FB_SDK_APP}"></script>
<script src="${FB_SDK_FS}"></script>
<script>
(function(){
'use strict';
var ROOT_ID='${rootId}';
var OBT_ID='${id}';
${HELPERS}
function render(o){
  var root=document.getElementById(ROOT_ID);
  if(!root)return;
  var img=o.images&&o.images[0]
    ?'<img class="rb-lp-img" src="'+rbEsc(o.images[0])+'" alt="'+rbEsc(o.fullName)+'">'
    :'<div class="rb-lp-placeholder">&#10013;</div>';
  var dates=[o.birthDate,o.deathDate].filter(Boolean).join(' \u2013 ');
  var excerpt=o.bio?rbEsc(o.bio.slice(0,200))+(o.bio.length>200?'...':''):'';
  var href=o.url||'#';
  root.innerHTML='<a href="'+rbEsc(href)+'" class="rb-lp-card">'+img+'<div class="rb-lp-body"><div class="rb-lp-name">'+rbEsc(o.fullName)+'</div><div class="rb-lp-dates">'+rbEsc(dates)+'</div><div class="rb-lp-excerpt">'+excerpt+'</div>'+(o.location?'<div class="rb-lp-loc">\uD83D\uDCCD '+rbEsc(o.location)+'</div>':'')+'</div></a>';
}
function load(){
  var db=rbDb();
  db.collection('obituaries').doc(OBT_ID).get()
    .then(function(doc){
      if(!doc.exists){throw new Error('Obituary not found');}
      var o=Object.assign({id:doc.id},doc.data());
      if(o.status!=='published'){throw new Error('Obituary not published');}
      render(o);
    })
    .catch(function(err){
      console.error('RB listing error:',err.code,err.message);
      var root=document.getElementById(ROOT_ID);
      if(root)root.innerHTML='<div style="color:#6b7280;font-size:.85rem">Unable to load.</div>';
    });
}
function tryLoad(n){
  if(typeof firebase!=='undefined'&&typeof firebase.firestore==='function'){load();}
  else if(n>0){setTimeout(function(){tryLoad(n-1);},300);}
  else{console.error('RB: Firebase SDK failed to load');}
}
if(document.readyState==='complete'||document.readyState==='interactive'){setTimeout(function(){tryLoad(15);},100);}
else{document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){tryLoad(15);},100);});}
})();
</script>`;
}

// ─── 3. ALL OBITUARIES LISTING PAGE ──────────────────────────────────────────
function allObituariesPageCode() {
  const rootId = 'rb-ao-root';
  return `<!-- ReBoost Marketing – All Obituaries Listing Page -->
<!-- Paste into a Custom HTML block on your all obituaries/memorial page. -->
<div id="${rootId}" class="rb-ao-container">
  <div class="rb-ao-title">Our Community</div>
  <input type="text" id="${rootId}-search" class="rb-ao-search" placeholder="Search by name..." />
  <div id="${rootId}-list" class="rb-ao-grid">
    <div style="text-align:center;color:#9ca3af;padding:40px">Loading obituaries...</div>
  </div>
</div>
<script src="${FB_SDK_APP}"></script>
<script src="${FB_SDK_FS}"></script>
<script>
(function(){
'use strict';
var ROOT_ID='${rootId}';
var SEARCH_ID='${rootId}-search';
var LIST_ID='${rootId}-list';
${HELPERS}
var allObituaries=[];
function renderObituaries(filtered){
  var list=document.getElementById(LIST_ID);
  if(!list)return;
  if(!filtered||!filtered.length){
    list.innerHTML='<div class="rb-ao-empty">No obituaries found.</div>';
    return;
  }
  list.innerHTML=filtered.map(function(o,i){
    var dates=[o.birthDate,o.deathDate].filter(Boolean).join(' \u2013 ');
    var excerpt=o.bio?rbEsc(o.bio.slice(0,180))+(o.bio.length>180?'...':''):'';
    var href=o.url||'#';
    var img=o.images&&o.images[0]?'<img class="rb-ao-card-img" src="'+rbEsc(o.images[0])+'" alt="'+rbEsc(o.fullName)+'">':'<div class="rb-ao-card-img" style="background:#374151;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:3rem">&#10013;</div>';
    return '<a href="'+rbEsc(href)+'" class="rb-ao-card"><div class="rb-ao-card-content"><div class="rb-ao-card-name">'+rbEsc(o.fullName)+'</div><div class="rb-ao-card-dates">'+rbEsc(dates)+'</div><div class="rb-ao-card-bio">'+excerpt+'</div><a href="'+rbEsc(href)+'" class="rb-ao-card-btn" onclick="event.stopPropagation()">Visit Obituary</a></div>'+img+'</a>';
  }).join('');
}
function handleSearch(){
  var search=document.getElementById(SEARCH_ID);
  if(!search)return;
  var query=search.value.toLowerCase();
  var filtered=query?allObituaries.filter(function(o){return o.fullName.toLowerCase().includes(query);}):allObituaries;
  renderObituaries(filtered);
}
function load(){
  var db=rbDb();
  db.collection('obituaries').where('status','==','published').get()
    .then(function(snap){
      allObituaries=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());})
        .sort(function(a,b){
          var ta=a.createdAt?(a.createdAt.seconds?a.createdAt.seconds*1000:(a.createdAt.toDate?a.createdAt.toDate().getTime():0)):0;
          var tb=b.createdAt?(b.createdAt.seconds?b.createdAt.seconds*1000:(b.createdAt.toDate?b.createdAt.toDate().getTime():0)):0;
          return tb-ta;
        });
      renderObituaries(allObituaries);
      var search=document.getElementById(SEARCH_ID);
      if(search)search.addEventListener('input',handleSearch);
    })
    .catch(function(err){
      console.error('RB all obituaries error:',err.code,err.message);
      var list=document.getElementById(LIST_ID);
      if(list)list.innerHTML='<div class="rb-ao-empty">Unable to load obituaries. Please refresh.</div>';
    });
}
function tryLoad(n){
  if(typeof firebase!=='undefined'&&typeof firebase.firestore==='function'){load();}
  else if(n>0){setTimeout(function(){tryLoad(n-1);},300);}
  else{console.error('RB: Firebase SDK failed to load');}
}
if(document.readyState==='complete'||document.readyState==='interactive'){setTimeout(function(){tryLoad(15);},100);}
else{document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){tryLoad(15);},100);});}
})();
</script>`;
}

// ─── 4. FULL OBITUARY PAGE ───────────────────────────────────────────────────
function fullPageCode(id, fullName, notifyUrl) {
  // Use server-rendered iframe approach for better performance and consistency
  return `<!-- ReBoost Marketing – Full Obituary: ${fullName} -->
<!-- Server-rendered full obituary page with memory wall. -->
<iframe
  src="https://obituary-management-system.vercel.app/api/embed/full/${id}"
  style="width: 100%; border: none; background: transparent;"
  title="Full Obituary: ${fullName}"
  scrolling="auto">
</iframe>
<script>
// Auto-resize iframe to fit content
(function(){
  var iframe = document.querySelector('iframe');
  if(iframe){
    var resize = function(){
      try {
        iframe.style.height = (iframe.contentDocument.body.scrollHeight + 20) + 'px';
      } catch(e) {}
    };
    iframe.onload = resize;
    window.addEventListener('resize', resize);
    setTimeout(resize, 500);
  }
})();
</script>`;
}

// Legacy implementation (kept for reference)
function fullPageCodeLegacy(id, fullName, notifyUrl) {
  const rootId  = 'rb-fp-' + id + '-root';  // outer container — never re-rendered
  const innerId = 'rb-fp-' + id + '-inner'; // inner content — gets replaced
  const memId   = 'rb-fp-' + id + '-mem';
  const formId  = 'rb-fp-' + id + '-form';
  const trackId = 'rb-fp-' + id + '-track';
  const dotsId  = 'rb-fp-' + id + '-dots';

  const notifySnippet = notifyUrl
    ? `try{fetch('${notifyUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({obituaryName:${JSON.stringify(fullName)},submitterName:name,relationship:rel,memoryText:text})});}catch(ne){console.warn('RB notify failed',ne);}`
    : '';

  return `<!-- ReBoost Marketing – Full Obituary: ${fullName} -->
<!-- Paste into a Custom HTML block on the dedicated obituary page. [LEGACY - NOT USED] -->
<style>
#${rootId}{font-family:Georgia,serif;max-width:780px;margin:0 auto}
.rb-fp-header{background:#111827;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;border-bottom:3px solid #d97706}
.rb-fp-header-link{text-decoration:none;color:inherit;display:block;transition:opacity .2s}
.rb-fp-header-link:hover{opacity:.85}
.rb-fp-deco{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px}
.rb-fp-deco-line{height:1px;width:48px;background:#d97706}
.rb-fp-name{color:#fff;font-size:2.7rem;margin:0 0 8px;letter-spacing:.04em;font-weight:600}
.rb-fp-dates{color:#f59e0b;font-size:1.25rem;letter-spacing:.1em;font-weight:500}
.rb-fp-loc{color:#9ca3af;font-size:1.1rem;margin-top:8px;font-style:italic}
.rb-fp-body{background:#f9fafb;padding:32px;border-radius:0 0 16px 16px}
.rb-fp-carousel{position:relative;margin-bottom:28px;border-radius:12px;overflow:hidden}
.rb-fp-carousel-track{display:flex;transition:transform .4s ease}
.rb-fp-carousel-slide{min-width:100%;aspect-ratio:16/9;background:#111827}
.rb-fp-carousel-slide img{width:100%;height:100%;object-fit:cover}
.rb-fp-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.5);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;line-height:1}
.rb-fp-btn-prev{left:8px}.rb-fp-btn-next{right:8px}
.rb-fp-dots{text-align:center;margin-top:8px}
.rb-fp-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d1d5db;margin:0 3px;cursor:pointer}
.rb-fp-dot.rb-active{background:#d97706}
.rb-fp-sh{display:flex;align-items:center;gap:12px;margin:24px 0 12px}
.rb-fp-sl{height:1px;flex:1;background:#e5e7eb}
.rb-fp-st{color:#b45309;font-size:.97rem;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap;font-weight:600}
.rb-fp-text{color:#374151;font-size:1.25rem;line-height:1.75;margin-bottom:8px}
.rb-fp-services{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:8px}
.rb-fp-svc{background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px}
.rb-fp-svc-type{color:#92400e;font-size:.97rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;font-weight:600}
.rb-fp-svc-dt{color:#1f2937;font-size:1.14rem;font-weight:600}
.rb-fp-svc-loc{color:#4b5563;font-size:1.06rem;margin-top:2px}
.rb-fp-mw{margin-top:32px;background:#1e1e2e;border-radius:12px;padding:24px}
.rb-fp-mw-title{color:#f59e0b;font-size:1.25rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;font-weight:600}
.rb-fp-mc{background:#13131f;border:1px solid #374151;border-radius:10px;padding:16px;margin-bottom:12px}
.rb-fp-mc-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px}
.rb-fp-mc-name{color:#f59e0b;font-size:1.15rem;font-weight:600}
.rb-fp-mc-rel{font-size:.97rem;color:#fff;background:rgba(245,158,11,.2);border:1px solid rgba(245,158,11,.3);padding:4px 10px;border-radius:999px;flex-shrink:0}
.rb-fp-mc-text{color:#d1d5db;font-size:1.125rem;line-height:1.65;margin-bottom:12px}
.rb-fp-mc-photos{display:flex;justify-content:center;margin:12px 0;position:relative;background:#374151;border-radius:8px;overflow:hidden;min-height:200px;max-height:300px}
.rb-fp-mc-photo-img{width:100%;height:100%;object-fit:cover}
.rb-fp-mc-photo-dots{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px}
.rb-fp-mc-photo-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4)}
.rb-fp-mc-photo-dot.rb-active{background:#d97706}
.rb-fp-mc-date{color:#6b7280;font-size:.97rem;margin-top:8px}
.rb-fp-form{background:#13131f;border:1px solid #374151;border-radius:10px;padding:20px;margin-top:16px}
.rb-fp-form-title{color:#fff;font-size:.9rem;margin-bottom:14px}
.rb-fp-field{margin-bottom:12px}
.rb-fp-label{display:block;color:#9ca3af;font-size:.8rem;margin-bottom:4px}
.rb-fp-input,.rb-fp-select,.rb-fp-textarea{width:100%;background:#1e1e2e;border:1px solid #374151;color:#fff;border-radius:8px;padding:10px 12px;font-size:.875rem;box-sizing:border-box;font-family:inherit}
.rb-fp-textarea{resize:vertical;min-height:100px}
.rb-fp-input:focus,.rb-fp-select:focus,.rb-fp-textarea:focus{outline:none;border-color:#d97706}
.rb-fp-submit{background:#d97706;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:.875rem;cursor:pointer;font-family:inherit}
.rb-fp-submit:hover{background:#b45309}
.rb-fp-submit:disabled{opacity:.6;cursor:default}
.rb-fp-ok{color:#34d399;font-size:.85rem;margin-top:8px}
.rb-fp-err{color:#f87171;font-size:.85rem;margin-top:8px}
</style>
<div id="${rootId}">
  <div id="${innerId}" style="color:#9ca3af;font-size:.9rem;text-align:center;padding:32px">Loading obituary...</div>
</div>
<script src="${FB_SDK_APP}"></script>
<script src="${FB_SDK_FS}"></script>
<script>
(function(){
'use strict';
var ROOT_ID='${rootId}';
var INNER_ID='${innerId}';
var MEM_ID='${memId}';
var FORM_ID='${formId}';
var TRACK_ID='${trackId}';
var DOTS_ID='${dotsId}';
var OBT_ID='${id}';
var API_BASE='${API_BASE}';
var _carIdx=0,_carLen=0;
${HELPERS}

/* ── Carousel ── */
function carUpdate(){
  var t=document.getElementById(TRACK_ID);
  if(t)t.style.transform='translateX(-'+_carIdx+'00%)';
  document.querySelectorAll('#'+DOTS_ID+' .rb-fp-dot').forEach(function(d,i){d.classList.toggle('rb-active',i===_carIdx);});
}
function carMove(dir){_carIdx=(_carIdx+dir+_carLen)%_carLen;carUpdate();}

/* ── Render memories ── */
function renderMems(mems){
  var el=document.getElementById(MEM_ID);
  if(!el)return;
  if(!mems||!mems.length){el.innerHTML='<p style="color:#6b7280;font-size:.85rem;text-align:center;padding:16px 0">No memories yet. Be the first.</p>';return;}
  el.innerHTML=mems.map(function(m,mi){
    var photoHtml='';
    if(m.photos&&m.photos.length>0){
      var photoId='rb-fp-mc-photo-'+mi;
      if(m.photos.length===1){
        photoHtml='<div class="rb-fp-mc-photos"><img class="rb-fp-mc-photo-img" src="'+rbEsc(m.photos[0])+'" alt="Memory photo"></div>';
      } else {
        var dots=m.photos.map(function(p,pi){return '<span class="rb-fp-mc-photo-dot'+(pi===0?' rb-active':'')+'" data-i="'+pi+'"></span>';}).join('');
        photoHtml='<div class="rb-fp-mc-photos" id="'+photoId+'"><img class="rb-fp-mc-photo-img" src="'+rbEsc(m.photos[0])+'" alt="Memory photo"><div class="rb-fp-mc-photo-dots">'+dots+'</div></div>';
      }
    }
    return '<div class="rb-fp-mc"><div class="rb-fp-mc-hd"><span class="rb-fp-mc-name">'+rbEsc(m.name)+'</span><span class="rb-fp-mc-rel">'+rbEsc(m.relationship)+'</span></div><div class="rb-fp-mc-text">'+rbEsc(m.memoryText)+'</div>'+photoHtml+(m.createdAt?'<div class="rb-fp-mc-date">'+rbDate(m.createdAt)+'</div>':'')+'</div>';
  }).join('');
  // Setup photo carousels
  setTimeout(function(){
    mems.forEach(function(m,mi){
      if(m.photos&&m.photos.length>1){
        var photoId='rb-fp-mc-photo-'+mi;
        var container=document.getElementById(photoId);
        if(!container)return;
        var img=container.querySelector('.rb-fp-mc-photo-img');
        var idx=0;
        var photos=m.photos;
        var interval=setInterval(function(){
          idx=(idx+1)%photos.length;
          img.src=rbEsc(photos[idx]);
          container.querySelectorAll('.rb-fp-mc-photo-dot').forEach(function(d,di){
            d.classList.toggle('rb-active',di===idx);
          });
        },4000);
      }
    });
  },100);
}

/* ── Refresh memories from Firestore ── */
function refreshMems(db){
  db.collection('memories').where('obituaryId','==',OBT_ID).get()
    .then(function(snap){
      var mems=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());})
        .filter(function(m){return m.published!==false;})
        .sort(function(a,b){
          var ta=a.createdAt?(a.createdAt.seconds?a.createdAt.seconds*1000:(a.createdAt.toDate?a.createdAt.toDate().getTime():0)):0;
          var tb=b.createdAt?(b.createdAt.seconds?b.createdAt.seconds*1000:(b.createdAt.toDate?b.createdAt.toDate().getTime():0)):0;
          return tb-ta;
        });
      renderMems(mems);
    })
    .catch(function(err){console.warn('RB refresh mems error:',err.code,err.message);});
}

/* ── Submit memory via REST API ── */
function setupForm(db){
  var btn=document.getElementById(FORM_ID+'-btn');
  if(!btn)return;
  btn.addEventListener('click',function(){
    var nameEl=document.getElementById(FORM_ID+'-name');
    var relEl=document.getElementById(FORM_ID+'-rel');
    var textEl=document.getElementById(FORM_ID+'-text');
    var msgEl=document.getElementById(FORM_ID+'-msg');
    var name=(nameEl&&nameEl.value||'').trim();
    var rel=relEl&&relEl.value||'Family';
    var text=(textEl&&textEl.value||'').trim();
    if(!name||!text){if(msgEl)msgEl.innerHTML='<div class="rb-fp-err">Please fill in your name and memory.</div>';return;}
    btn.disabled=true;btn.textContent='Submitting...';
    fetch(API_BASE+'/api/memories',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({obituaryId:OBT_ID,name:name,relationship:rel,memoryText:text,photos:[]})
    })
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(){
      ${notifySnippet}
      if(nameEl)nameEl.value='';
      if(textEl)textEl.value='';
      if(msgEl)msgEl.innerHTML='<div class="rb-fp-ok">&#10003; Memory shared. Thank you.</div>';
      setTimeout(function(){refreshMems(db);},800);
    })
    .catch(function(err){
      console.error('RB submit error:',err);
      if(msgEl)msgEl.innerHTML='<div class="rb-fp-err">Unable to submit. Please try again.</div>';
    })
    .finally(function(){btn.disabled=false;btn.textContent='Share Memory';});
  });
}

/* ── Main render ── */
function renderPage(o,mems){
  var dates=[o.birthDate,o.deathDate].filter(Boolean).join(' \u2013 ');

  /* carousel */
  var imgs=o.images||[];
  _carLen=imgs.length;
  var carousel='';
  if(imgs.length===1){
    carousel='<div class="rb-fp-carousel"><img src="'+rbEsc(imgs[0])+'" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;display:block"></div>';
  } else if(imgs.length>1){
    var slides=imgs.map(function(u){return '<div class="rb-fp-carousel-slide"><img src="'+rbEsc(u)+'" alt=""></div>';}).join('');
    var dots=imgs.map(function(u,i){return '<span class="rb-fp-dot'+(i===0?' rb-active':'')+'" data-i="'+i+'"></span>';}).join('');
    carousel='<div class="rb-fp-carousel"><div id="'+TRACK_ID+'" class="rb-fp-carousel-track">'+slides+'</div><button class="rb-fp-btn rb-fp-btn-prev" onclick="rbCarMove_'+OBT_ID+'(-1)">&#8249;</button><button class="rb-fp-btn rb-fp-btn-next" onclick="rbCarMove_'+OBT_ID+'(1)">&#8250;</button></div><div id="'+DOTS_ID+'" class="rb-fp-dots">'+dots+'</div>';
  }

  /* services */
  var svcs='';
  if(o.services&&o.services.length){
    svcs='<div class="rb-fp-sh"><div class="rb-fp-sl"></div><div class="rb-fp-st">Memorial Services</div><div class="rb-fp-sl"></div></div>'
      +'<div class="rb-fp-services">'
      +o.services.map(function(s){return '<div class="rb-fp-svc"><div class="rb-fp-svc-type">'+rbEsc(s.type)+'</div><div class="rb-fp-svc-dt">'+(s.date?rbEsc(s.date):'')+(s.time?' at '+rbEsc(s.time):'')+'</div>'+(s.location?'<div class="rb-fp-svc-loc">'+rbEsc(s.location)+'</div>':'')+'</div>';}).join('')
      +'</div>';
  }

  /* memory form */
  var form='<div class="rb-fp-form" id="'+FORM_ID+'">'
    +'<div class="rb-fp-form-title">Share a Memory</div>'
    +'<div class="rb-fp-field"><label class="rb-fp-label">Your Name</label><input class="rb-fp-input" id="'+FORM_ID+'-name" placeholder="Jane Smith"></div>'
    +'<div class="rb-fp-field"><label class="rb-fp-label">Relationship</label><select class="rb-fp-select" id="'+FORM_ID+'-rel"><option>Family</option><option>Friend</option><option>Colleague</option><option>Other</option></select></div>'
    +'<div class="rb-fp-field"><label class="rb-fp-label">Your Memory</label><textarea class="rb-fp-textarea" id="'+FORM_ID+'-text" placeholder="Share a favorite memory..."></textarea></div>'
    +'<button class="rb-fp-submit" id="'+FORM_ID+'-btn">Share Memory</button>'
    +'<div id="'+FORM_ID+'-msg"></div>'
    +'</div>';

  var inner=document.getElementById(INNER_ID);
  if(!inner)return;
  var headerContent='<div class="rb-fp-deco"><div class="rb-fp-deco-line"></div><span style="color:#f59e0b;font-size:1.2rem">&#10013;</span><div class="rb-fp-deco-line"></div></div>'
    +'<h1 class="rb-fp-name">'+rbEsc(o.fullName)+'</h1>'
    +(dates?'<div class="rb-fp-dates">'+rbEsc(dates)+'</div>':'')
    +(o.location?'<div class="rb-fp-loc">'+rbEsc(o.location)+'</div>':'');
  var headerWrap=o.url
    ?'<a href="'+rbEsc(o.url)+'" class="rb-fp-header-link">'+headerContent+'</a>'
    :headerContent;
  inner.innerHTML=
    '<div class="rb-fp-header">'+headerWrap+'</div>'
    +'<div class="rb-fp-body">'
      +carousel
      +(o.bio?'<div class="rb-fp-sh"><div class="rb-fp-sl"></div><div class="rb-fp-st">Life &amp; Legacy</div><div class="rb-fp-sl"></div></div><div class="rb-fp-text">'+rbEsc(o.bio).replace(/\n/g,'<br>')+'</div>':'')
      +(o.survivors?'<div class="rb-fp-sh"><div class="rb-fp-sl"></div><div class="rb-fp-st">Survived By</div><div class="rb-fp-sl"></div></div><div class="rb-fp-text">'+rbEsc(o.survivors)+'</div>':'')
      +(o.predeceased?'<div class="rb-fp-sh"><div class="rb-fp-sl"></div><div class="rb-fp-st">Preceded in Death By</div><div class="rb-fp-sl"></div></div><div class="rb-fp-text">'+rbEsc(o.predeceased)+'</div>':'')
      +svcs
    +'</div>'
    +'<div class="rb-fp-mw"><div class="rb-fp-mw-title">Memory Wall</div><div id="'+MEM_ID+'"></div>'+form+'</div>';

  renderMems(mems);

  /* carousel setup */
  if(imgs.length>1){
    document.querySelectorAll('#'+DOTS_ID+' .rb-fp-dot').forEach(function(dot){
      dot.addEventListener('click',function(){_carIdx=parseInt(dot.getAttribute('data-i')||'0',10);carUpdate();});
    });
    setInterval(function(){_carIdx=(_carIdx+1)%_carLen;carUpdate();},4500);
  }
}

/* expose carousel for onclick */
window['rbCarMove_'+OBT_ID]=carMove;

/* ── Load data ── */
function load(){
  var db=rbDb();
  var obPromise=db.collection('obituaries').doc(OBT_ID).get();
  var memPromise=db.collection('memories').where('obituaryId','==',OBT_ID).get();

  Promise.all([obPromise,memPromise])
    .then(function(results){
      var obDoc=results[0],memSnap=results[1];
      if(!obDoc.exists){throw new Error('Obituary not found (ID: '+OBT_ID+')');}
      var o=Object.assign({id:obDoc.id},obDoc.data());
      if(o.status!=='published'){throw new Error('Obituary is not published');}
      var mems=memSnap.docs.map(function(d){return Object.assign({id:d.id},d.data());})
        .filter(function(m){return m.published!==false;})
        .sort(function(a,b){
          var ta=a.createdAt?(a.createdAt.seconds?a.createdAt.seconds*1000:(a.createdAt.toDate?a.createdAt.toDate().getTime():0)):0;
          var tb=b.createdAt?(b.createdAt.seconds?b.createdAt.seconds*1000:(b.createdAt.toDate?b.createdAt.toDate().getTime():0)):0;
          return tb-ta;
        });
      renderPage(o,mems);
      setupForm(db);
    })
    .catch(function(err){
      console.error('RB full page error:',err.code,err.message,err);
      var inner=document.getElementById(INNER_ID);
      if(inner)inner.innerHTML='<div style="color:#9ca3af;font-size:.9rem;text-align:center;padding:32px">Unable to load obituary.<br><span style="font-size:.78rem;opacity:.6">'+rbEsc(err.message)+'</span></div>';
    });
}

function tryLoad(n){
  if(typeof firebase!=='undefined'&&typeof firebase.firestore==='function'){load();}
  else if(n>0){setTimeout(function(){tryLoad(n-1);},300);}
  else{
    console.error('RB: Firebase SDK failed to load after retries');
    var inner=document.getElementById(INNER_ID);
    if(inner)inner.innerHTML='<div style="color:#9ca3af;font-size:.9rem;text-align:center;padding:32px">Page script failed to load. Please refresh.</div>';
  }
}
if(document.readyState==='complete'||document.readyState==='interactive'){setTimeout(function(){tryLoad(15);},100);}
else{document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){tryLoad(15);},100);});}
})();
</script>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmbedCodes({ obituary }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!obituary?.id) return null;

  const notifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/notify`
    : `${API_BASE}/api/notify`;

  const codes = [
    {
      key: 'home',
      title: 'Home Page Code',
      tag: 'Paste once — shows 3 most recent',
      where: 'Paste into a Custom HTML element on your homepage. Shows the 3 most recent published obituaries. Paste once — auto-updates forever.',
      code: homePageCode(),
    },
    {
      key: 'allobs',
      title: 'All Obituaries Page Code',
      tag: 'Paste once — shows all with search',
      where: 'Paste into a Custom HTML element on your all obituaries/memorial page. Shows all published obituaries with search bar. Auto-updates when you add new records.',
      code: allObituariesPageCode(),
    },
    {
      key: 'listing',
      title: 'Individual Obituary Card Code',
      tag: `Card for ${obituary.fullName}`,
      where: 'Optional: Paste into a Custom HTML element to show just this obituary as a card. Auto-updates when you edit.',
      code: listingPageCode(obituary.id, obituary.fullName),
    },
    {
      key: 'full',
      title: 'Full Page Code',
      tag: `Complete obituary for ${obituary.fullName}`,
      where: 'Paste into a Custom HTML element on the dedicated obituary page. Shows the full obituary with photo carousel, bio, services, and live Memory Wall.',
      code: fullPageCode(obituary.id, obituary.fullName, notifyUrl),
    },
  ];

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  return (
    <div className="mt-8">
      <div className="mb-6 flex items-start gap-3 bg-green-900 bg-opacity-20 border border-green-700 border-opacity-40 rounded-xl px-5 py-4">
        <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-green-400 font-medium text-sm">Obituary saved successfully!</p>
          <p className="text-gray-400 text-sm mt-1">
            Copy the embed codes below and paste into your GHL Custom HTML blocks.{' '}
            <strong className="text-white">Paste once — they stay live forever.</strong>
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {codes.map(({ key, title, tag, where, code }) => (
          <div key={key} className="bg-dark-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-medium">{title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-gold-500 bg-opacity-20 border border-gold-500 border-opacity-30 text-gold-400 rounded-full">
                    {tag}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1.5 max-w-xl">{where}</p>
              </div>
              <button
                onClick={() => copy(key, code)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  copiedKey === key
                    ? 'bg-green-700 text-white'
                    : 'bg-gold-500 hover:bg-gold-600 text-white'
                }`}
              >
                {copiedKey === key ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Code
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <pre className="text-xs text-gray-400 p-4 overflow-x-auto bg-dark-950 max-h-40 leading-relaxed">
                <code>{code.slice(0, 500)}…</code>
              </pre>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-dark-950 to-transparent pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-gray-600 text-xs mt-4 text-center">
        Embed codes use Firebase directly — no Vercel middleman. Updates appear instantly.
      </p>
    </div>
  );
}
