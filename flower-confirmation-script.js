<!--
  ============================================================================
  FLOWER ORDER CONFIRMATION BLOCK — paste into a Custom HTML element on the
  GHL flower checkout page, above the existing Cart / Order form.
  ============================================================================
-->

<style>
  :root{
    --sfc-gold:#d4af7f;
    --sfc-gold-dk:#b8935c;
    --sfc-gold-soft:#f3e3c8;
    --sfc-cream:#fffdf8;
    --sfc-ink:#1f2937;
    --sfc-ink-soft:#374151;
    --sfc-muted:#6b7280;
    --sfc-line:#e7e1d4;
  }
  #sfc-wrap{
    display:none;
    max-width:600px;
    margin:0 auto 32px;
    font-family:Georgia,"Times New Roman",serif;
    color:var(--sfc-ink);
    background:var(--sfc-cream);
    border:1px solid var(--sfc-line);
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 10px 30px rgba(0,0,0,0.07), 0 3px 8px rgba(212,175,127,0.14);
    box-sizing:border-box;
    animation:sfc-fade .45s ease-out;
  }
  @keyframes sfc-fade{ from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }

  /* ─── Header ─── */
  .sfc-head{
    background:radial-gradient(ellipse at top,#1a1528 0%,#0f0b18 55%,#080510 100%);
    padding:36px 28px 38px;
    color:#fff;
    text-align:center;
    position:relative;
    overflow:hidden;
  }
  .sfc-head::before{
    content:"";
    position:absolute;
    top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,rgba(212,175,127,.55) 50%,transparent);
  }
  .sfc-head::after{
    content:"";
    position:absolute;
    bottom:0;left:50%;transform:translateX(-50%);
    width:70%;height:1px;
    background:linear-gradient(90deg,transparent,rgba(212,175,127,.35) 50%,transparent);
  }
  .sfc-head-deco{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:14px;
    margin:0 auto 16px;
    max-width:260px;
  }
  .sfc-head-deco span.line{
    flex:1;
    height:1px;
    background:linear-gradient(90deg,transparent,rgba(212,175,127,.55));
  }
  .sfc-head-deco span.line.right{
    background:linear-gradient(90deg,rgba(212,175,127,.55),transparent);
  }
  .sfc-head-deco span.diamond{
    color:#d4af7f;
    font-size:11px;
    letter-spacing:.2em;
    filter:drop-shadow(0 0 6px rgba(212,175,127,.4));
  }
  .sfc-head-title{
    margin:0;
    font-size:12px;
    font-weight:500;
    text-transform:uppercase;
    letter-spacing:.32em;
    color:#d4af7f;
    font-family:'Helvetica Neue',Arial,sans-serif;
    opacity:.9;
  }
  .sfc-head-in-memory{
    margin:16px 0 6px;
    font-size:12px;
    letter-spacing:.22em;
    text-transform:uppercase;
    color:#9a8f7a;
    font-family:'Helvetica Neue',Arial,sans-serif;
    font-weight:500;
  }
  .sfc-head-name{
    margin:0;
    font-family:Georgia,"Times New Roman",serif;
    font-size:32px;
    font-weight:500;
    line-height:1.15;
    color:#f5e9d4;
    letter-spacing:.015em;
    text-shadow:0 2px 18px rgba(212,175,127,.18);
  }

  /* ─── Body ─── */
  .sfc-body{ padding:22px 24px 24px; }

  .sfc-service{
    background:#faf6ed;
    border:1px solid #ece4d2;
    border-radius:10px;
    padding:12px 14px;
    margin-bottom:18px;
    font-size:14px;
    color:var(--sfc-ink-soft);
    line-height:1.55;
  }
  .sfc-service > div{ padding:2px 0; }
  .sfc-service .lbl{
    color:var(--sfc-muted);
    font-weight:700;
    margin-right:6px;
    font-size:12px;
    text-transform:uppercase;
    letter-spacing:.05em;
  }
  .sfc-service:empty{ display:none; }

  .sfc-section-label{
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.15em;
    color:var(--sfc-muted);
    font-weight:700;
    margin:0 0 10px;
  }
  .sfc-items{
    list-style:none;
    margin:0 0 4px;
    padding:0;
    border:1px solid var(--sfc-line);
    border-radius:10px;
    overflow:hidden;
    background:#fff;
  }
  .sfc-item{
    display:flex;
    gap:14px;
    align-items:center;
    padding:12px 14px;
    border-bottom:1px solid var(--sfc-line);
  }
  .sfc-item:last-child{ border-bottom:none; }
  .sfc-item-img{
    flex:0 0 64px;
    width:64px;
    height:64px;
    border-radius:8px;
    overflow:hidden;
    background:#faf6ef;
    border:1px solid var(--sfc-line);
    display:flex;
    align-items:center;
    justify-content:center;
    color:var(--sfc-gold-dk);
    font-size:22px;
  }
  .sfc-item-img img{ width:100%; height:100%; object-fit:cover; display:block; }
  .sfc-item-info{ flex:1; min-width:0; }
  .sfc-item-name{
    font-size:15.5px;
    font-weight:700;
    color:var(--sfc-ink);
    line-height:1.3;
    word-break:break-word;
  }
  .sfc-item-meta{
    margin-top:3px;
    font-size:13px;
    color:var(--sfc-muted);
    font-style:italic;
  }

  /* ─── Fields ─── */
  .sfc-field{ margin-top:18px; }
  .sfc-field label{
    display:block;
    font-size:14px;
    color:var(--sfc-ink-soft);
    margin-bottom:8px;
    font-weight:600;
    font-family:Georgia,serif;
  }
  #sfc-email, #sfc-name, #sfc-relationship{
    width:100%;
    padding:12px 14px;
    font-size:15px;
    border:1px solid #d8cfbd;
    border-radius:8px;
    background:#fff;
    box-sizing:border-box;
    font-family:inherit;
    color:var(--sfc-ink);
    transition:border-color .15s, box-shadow .15s;
  }
  #sfc-email:focus, #sfc-name:focus, #sfc-relationship:focus{
    outline:none;
    border-color:var(--sfc-gold);
    box-shadow:0 0 0 3px rgba(212,175,127,0.22);
  }
  #sfc-relationship{
    appearance:none;
    -webkit-appearance:none;
    background-image:url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%3E%3Cpath%20fill%3D%22%23b8935c%22%20d%3D%22M0%200l5%206%205-6z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat:no-repeat;
    background-position:right 14px center;
    padding-right:36px;
    cursor:pointer;
  }

  /* ─── Button ─── */
  #sfc-btn{
    margin-top:22px;
    width:100%;
    padding:15px 28px;
    font-size:14px;
    font-weight:700;
    letter-spacing:.18em;
    text-transform:uppercase;
    color:#1a1208;
    background:linear-gradient(135deg,#e8c492 0%,#c9a96e 50%,#b8935c 100%);
    border:none;
    border-radius:8px;
    cursor:pointer;
    transition:transform .12s, box-shadow .2s, filter .2s;
    font-family:'Helvetica Neue',Arial,sans-serif;
    box-shadow:0 3px 14px rgba(212,175,127,.4), inset 0 1px 0 rgba(255,255,255,.35);
  }
  #sfc-btn:hover:not(:disabled){ transform:translateY(-1px); filter:brightness(1.06); box-shadow:0 6px 20px rgba(212,175,127,.55), inset 0 1px 0 rgba(255,255,255,.4); }
  #sfc-btn:active:not(:disabled){ transform:translateY(0); }
  #sfc-btn:disabled{ opacity:.7; cursor:not-allowed; transform:none; filter:none; }
  #sfc-status{ margin-top:12px; font-size:13.5px; min-height:18px; text-align:center; line-height:1.5; }
  #sfc-status.ok{ color:#065f46; font-weight:700; }
  #sfc-status.err{ color:#b91c1c; font-weight:600; }
</style>

<div id="sfc-wrap">
  <div class="sfc-head">
    <div class="sfc-head-deco"><span class="line"></span><span class="diamond">◆</span><span class="line right"></span></div>
    <div class="sfc-head-title">Please Confirm Your Tribute</div>
    <div class="sfc-head-in-memory">In Loving Memory Of</div>
    <div class="sfc-head-name" id="sfc-head-name"></div>
  </div>
  <div class="sfc-body">
    <div class="sfc-service" id="sfc-service"></div>
    <div class="sfc-section-label" id="sfc-section-label">Your Arrangement</div>
    <ul class="sfc-items" id="sfc-items"></ul>

    <div class="sfc-field">
      <label for="sfc-name">Your name (as you'd like it to appear on the memory wall)</label>
      <input id="sfc-name" type="text" placeholder="Jane Smith" autocomplete="name"/>
    </div>

    <div class="sfc-field">
      <label for="sfc-relationship">How did you know them?</label>
      <select id="sfc-relationship">
        <option value="">Select a relationship…</option>
        <option value="Family">Family</option>
        <option value="Friend">Friend</option>
        <option value="Neighbor">Neighbor</option>
        <option value="Co-worker">Co-worker</option>
        <option value="Classmate">Classmate</option>
        <option value="Community member">Community member</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div class="sfc-field">
      <label for="sfc-email">Where should we send your order confirmation?</label>
      <input id="sfc-email" type="email" placeholder="you@example.com" autocomplete="email"/>
    </div>

    <button id="sfc-btn" type="button">Confirm My Tribute</button>
    <div id="sfc-status"></div>
  </div>
</div>

<script>
(function () {
  var API = 'https://obituary-management-system.vercel.app';

  function readData() {
    var d = {};
    var MAP = {
      deceasedName:['deceased_name','deceasedName'],serviceDate:['service_date','serviceDate'],
      serviceTime:['service_time','serviceTime'],serviceDateTime:['service_datetime','serviceDateTime'],
      serviceLocation:['service_location','serviceLocation'],obituaryUrl:['obituary_url','obituaryUrl'],
      flowerOrder:['flower_order','flowerOrder']
    };
    try {
      var p = new URLSearchParams(window.location.search);
      Object.keys(MAP).forEach(function(out){
        for (var i = 0; i < MAP[out].length; i++) {
          var v = p.get(MAP[out][i]);
          if (v) { d[out] = v; break; }
        }
      });
    } catch(e) {}
    if (!d.deceasedName && window.parent && window.parent !== window) {
      try {
        var po = window.parent.obituaryData || window.parent.obituaryFlowerContext;
        if (po && po.deceasedName) Object.keys(po).forEach(function(k){ if (!d[k]) d[k] = po[k]; });
      } catch(e) {}
    }
    if (!d.deceasedName) {
      ['obituaryData','obituaryFlowerContext'].forEach(function(key){
        if (d.deceasedName) return;
        try {
          var stored = JSON.parse(localStorage.getItem(key) || '{}');
          if (stored && stored.deceasedName) Object.keys(stored).forEach(function(k){ if (!d[k]) d[k] = stored[k]; });
        } catch(e) {}
      });
    }
    return d;
  }

  function scrubName(s) {
    return String(s || '').replace(/\$[\d,.]+/g,'').replace(/\s*Qty\s*:?\s*\d+.*$/gi,'')
      .replace(/\s*\(Qty[^)]*\)/gi,'').replace(/\s*Quantity\s*:?\s*\d+.*$/gi,'')
      .replace(/\s*x\s*\d+\s*$/gi,'').replace(/\s+/g,' ').trim();
  }

  function captureCart() {
    var items = [], seen = {};
    var selectors = ['.cart-item','[data-cart-item]','.product-item','[class*="product"][class*="item"]','.order-item','.hl_order-bump--product'];
    for (var s = 0; s < selectors.length; s++) {
      var nodes = document.querySelectorAll(selectors[s]);
      if (!nodes.length) continue;
      nodes.forEach(function (node) {
        var nameEl = node.querySelector('[class*="name"], [class*="title"], h3, h4, .product-name, strong');
        var name = nameEl ? scrubName(nameEl.textContent) : '';
        if (!name || seen[name]) return;
        seen[name] = true;
        var imgEl = node.querySelector('img');
        var img = imgEl && imgEl.src ? imgEl.src : '';
        var sizeEl = node.querySelector('[class*="size"], [class*="option"], .variant');
        var size = sizeEl ? scrubName(sizeEl.textContent) : '';
        var qtyEl = node.querySelector('[class*="qty"], [class*="quantity"], input[type="number"]');
        var qty = '';
        if (qtyEl) qty = (qtyEl.value || qtyEl.textContent || '').replace(/[^\d]/g,'') || '';
        items.push({ name: name, size: size, qty: qty, image: img });
      });
      if (items.length) break;
    }
    return items;
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function renderItems(items) {
    return items.map(function(it){
      var imgHtml = it.image ? '<img src="' + esc(it.image) + '" alt="' + esc(it.name) + '"/>' : '<span>&#128144;</span>';
      var metaParts = [];
      if (it.size) metaParts.push(esc(it.size));
      if (it.qty && it.qty !== '1') metaParts.push('Qty ' + esc(it.qty));
      var meta = metaParts.length ? '<div class="sfc-item-meta">' + metaParts.join(' &middot; ') + '</div>' : '';
      return '<li class="sfc-item"><div class="sfc-item-img">' + imgHtml + '</div><div class="sfc-item-info"><div class="sfc-item-name">' + esc(it.name) + '</div>' + meta + '</div></li>';
    }).join('');
  }

  function summarizeForBackend(items) {
    return items.map(function(it){
      var base = it.size ? (it.name + ' — ' + it.size) : it.name;
      return (it.qty && it.qty !== '1') ? (base + ' × ' + it.qty) : base;
    }).join(', ');
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    var wrap = document.getElementById('sfc-wrap');
    if (!wrap) return;
    var d = readData();
    if (!d.deceasedName) { console.warn('[SFC] no deceased name — form hidden'); return; }
    var cart = captureCart();
    if (!cart.length && !d.flowerOrder) return;
    if (!cart.length && d.flowerOrder) cart = [{ name: d.flowerOrder, size:'', qty:'', image:'' }];
    initialized = true;
    document.getElementById('sfc-head-name').textContent = d.deceasedName;
    document.getElementById('sfc-section-label').textContent = cart.length > 1 ? 'Your Arrangements (' + cart.length + ')' : 'Your Arrangement';
    document.getElementById('sfc-items').innerHTML = renderItems(cart);
    var svc = [];
    if (d.serviceDateTime || d.serviceDate) svc.push('<div>📅 <span class="lbl">Service</span> ' + esc(d.serviceDateTime || d.serviceDate) + '</div>');
    if (d.serviceLocation) svc.push('<div>📍 <span class="lbl">Location</span> ' + esc(d.serviceLocation) + '</div>');
    document.getElementById('sfc-service').innerHTML = svc.join('');
    wrap.style.display = 'block';
    wire(d, cart);
  }

  function wire(d, cart) {
    var btn = document.getElementById('sfc-btn');
    var status = document.getElementById('sfc-status');
    var email = document.getElementById('sfc-email');
    var nameEl = document.getElementById('sfc-name');
    var relEl = document.getElementById('sfc-relationship');
    var done = false;
    var flowerName = summarizeForBackend(cart);
    var flowerImages = [];
    for (var i = 0; i < cart.length; i++) if (cart[i].image) flowerImages.push(cart[i].image);
    var flowerImage = flowerImages[0] || '';

    btn.addEventListener('click', async function () {
      if (done) return;
      var fullName = (nameEl.value || '').trim();
      var relation = (relEl.value || '').trim();
      var addr     = (email.value || '').trim();
      if (!fullName) { status.textContent = 'Please enter your name to confirm.'; status.className = 'err'; nameEl.focus(); return; }
      if (!relation) { status.textContent = 'Please let us know how you knew them.'; status.className = 'err'; relEl.focus(); return; }
      if (!addr || addr.indexOf('@') < 0) { status.textContent = 'Please enter your email address to confirm.'; status.className = 'err'; email.focus(); return; }
      btn.disabled = true; btn.textContent = 'Confirming…'; status.textContent = ''; status.className = '';
      try {
        var res = await fetch(API + '/api/ghl/update-contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: fullName, customerEmail: addr, relationship: relation,
            deceasedName: d.deceasedName, serviceDate: d.serviceDate || '',
            serviceDateTime: d.serviceDateTime || '', serviceLocation: d.serviceLocation || '',
            flowerOrder: flowerName, flowerImage: flowerImage, flowerImages: flowerImages,
            obituaryUrl: d.obituaryUrl || ''
          })
        });
        var result = await res.json().catch(function(){ return {}; });
        if (!res.ok) throw new Error(result.error || ('HTTP ' + res.status));
        done = true;
        btn.textContent = '✓ Tribute Confirmed';
        btn.style.background = 'linear-gradient(135deg,#065f46 0%,#047857 100%)';
        btn.style.boxShadow = '0 2px 6px rgba(6,95,70,0.3)';
        status.innerHTML = 'Your tribute is saved.<br/>Complete checkout below to publish it on the memory wall.';
        status.className = 'ok';
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Confirm My Tribute';
        status.textContent = 'Something went wrong: ' + (err.message || 'please try again');
        status.className = 'err';
        console.error('[SFC]', err);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  [300, 900, 1800, 3500, 6000].forEach(function(t){ setTimeout(init, t); });
  if (window.MutationObserver) new MutationObserver(function(){ if (!initialized) init(); }).observe(document.body, { childList:true, subtree:true });
})();
</script>
