<!--
  ============================================================================
  FLOWER ORDER CONFIRMATION BLOCK — paste into a Custom HTML element on the
  GHL flower checkout page, above the existing Cart / Order form.

  Works alongside your existing site-wide scripts:
    • The obituary page already captures postMessage data and passes it to
      this page as URL params (snake_case: deceased_name, service_date, ...)
      and also writes localStorage.obituaryData.
    • Your existing checkout-page script injects the tribute message into
      the GHL notes textarea — leave it in place, this block does NOT
      replace it. This block ONLY adds the customer-facing confirmation
      box and captures the customer email for the backend.

  This script:
    1. Reads the deceased / service info (URL params → parent → localStorage)
       — supports BOTH snake_case (deceased_name) and camelCase (deceasedName)
    2. Scrapes the GHL cart for the flower name, size, qty, and image
    3. Shows a polished confirmation card with all of that info
    4. On "Confirm" → POSTs to /api/ghl/update-contact so the backend has:
         customer email, deceased name, flower name, flower image, service
       (the memory-wall entry + director/floral-shop emails depend on this)
  ============================================================================
-->

<style>
  :root{
    --sfc-gold:#d4af7f;
    --sfc-gold-dk:#b8935c;
    --sfc-gold-lt:#f3c071;
    --sfc-ink:#1f2937;
    --sfc-muted:#6b7280;
    --sfc-line:#e5e7eb;
  }
  #sfc-wrap{
    display:none;
    max-width:560px;
    margin:0 auto 28px;
    font-family:Georgia,"Times New Roman",serif;
    color:var(--sfc-ink);
    background:#fffdf8;
    border:1px solid var(--sfc-line);
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(212,175,127,0.12);
    box-sizing:border-box;
    animation:sfc-fade .45s ease-out;
  }
  @keyframes sfc-fade{ from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:none;} }
  .sfc-head{
    background:linear-gradient(135deg,#d4af7f 0%,#c9a96e 100%);
    padding:14px 22px;
    color:#fff;
  }
  .sfc-head h3{
    margin:0;
    font-size:17px;
    font-weight:700;
    letter-spacing:.02em;
  }
  .sfc-head p{
    margin:2px 0 0;
    font-size:13px;
    opacity:.95;
    font-style:italic;
  }
  .sfc-body{ padding:18px 22px 20px; }
  .sfc-hero{
    display:flex;
    gap:14px;
    align-items:flex-start;
    padding-bottom:14px;
    border-bottom:1px solid var(--sfc-line);
    margin-bottom:14px;
  }
  .sfc-hero-img{
    flex:0 0 90px;
    height:90px;
    border-radius:8px;
    overflow:hidden;
    background:#faf6ef;
    border:1px solid var(--sfc-line);
  }
  .sfc-hero-img img{ width:100%; height:100%; object-fit:cover; display:block; }
  .sfc-hero-info{ flex:1; min-width:0; }
  .sfc-hero-info .label{
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.1em;
    color:var(--sfc-muted);
    margin-bottom:3px;
  }
  .sfc-hero-info .flower{
    font-size:17px;
    font-weight:700;
    color:var(--sfc-ink);
    line-height:1.25;
    word-break:break-word;
  }
  .sfc-hero-info .sub{
    font-size:13px;
    color:var(--sfc-muted);
    margin-top:3px;
  }
  .sfc-lines > div{
    padding:4px 0;
    font-size:14px;
    line-height:1.5;
    color:#374151;
  }
  .sfc-lines .lbl{
    color:var(--sfc-muted);
    font-weight:600;
    margin-right:6px;
  }
  .sfc-field{
    margin-top:16px;
  }
  .sfc-field label{
    display:block;
    font-size:12px;
    text-transform:uppercase;
    letter-spacing:.08em;
    color:var(--sfc-muted);
    margin-bottom:6px;
    font-weight:600;
  }
  #sfc-email{
    width:100%;
    padding:11px 14px;
    font-size:14px;
    border:1px solid #d1d5db;
    border-radius:8px;
    background:#fff;
    box-sizing:border-box;
    font-family:inherit;
    color:var(--sfc-ink);
    transition:border-color .15s, box-shadow .15s;
  }
  #sfc-email:focus{
    outline:none;
    border-color:var(--sfc-gold);
    box-shadow:0 0 0 3px rgba(212,175,127,0.22);
  }
  #sfc-btn{
    margin-top:12px;
    width:100%;
    padding:13px 16px;
    font-size:15px;
    font-weight:700;
    letter-spacing:.02em;
    color:#fff;
    background:linear-gradient(135deg,var(--sfc-gold) 0%,var(--sfc-gold-dk) 100%);
    border:none;
    border-radius:8px;
    cursor:pointer;
    transition:transform .12s, box-shadow .12s, background .2s;
    font-family:inherit;
    box-shadow:0 2px 6px rgba(184,147,92,0.3);
  }
  #sfc-btn:hover:not(:disabled){ transform:translateY(-1px); box-shadow:0 4px 10px rgba(184,147,92,0.4); }
  #sfc-btn:active:not(:disabled){ transform:translateY(0); }
  #sfc-btn:disabled{ opacity:.7; cursor:not-allowed; }
  #sfc-status{ margin-top:10px; font-size:13px; min-height:18px; text-align:center; }
  #sfc-status.ok{ color:#065f46; font-weight:600; }
  #sfc-status.err{ color:#b91c1c; font-weight:600; }
  .sfc-help{
    font-size:12px;
    color:var(--sfc-muted);
    text-align:center;
    margin-top:10px;
    line-height:1.5;
    font-style:italic;
  }
</style>

<div id="sfc-wrap">
  <div class="sfc-head">
    <h3>💐 Confirm your tribute</h3>
    <p id="sfc-head-sub"></p>
  </div>
  <div class="sfc-body">
    <div class="sfc-hero">
      <div class="sfc-hero-img" id="sfc-hero-img" style="display:none"><img id="sfc-hero-img-el" alt=""/></div>
      <div class="sfc-hero-info">
        <div class="label">Arrangement</div>
        <div class="flower" id="sfc-flower"></div>
        <div class="sub" id="sfc-flower-sub"></div>
      </div>
    </div>
    <div class="sfc-lines" id="sfc-details"></div>
    <div class="sfc-field">
      <label for="sfc-email">Your email (so we can send order details & link the memory)</label>
      <input id="sfc-email" type="email" placeholder="you@example.com" autocomplete="email"/>
    </div>
    <button id="sfc-btn" type="button">Confirm Flower Tribute</button>
    <div id="sfc-status"></div>
    <div class="sfc-help">Complete the order form below to finish your purchase. Your tribute will appear on the memory wall once payment is confirmed.</div>
  </div>
</div>

<script>
(function () {
  var API = 'https://obituary-management-system.vercel.app';

  /* ───────────────────────────────────────────────────────────────────────
     Read obit data — supports both snake_case (from existing site script)
     and camelCase, plus localStorage fallback. */
  function readData() {
    var d = {};
    var MAP = {
      deceasedName:    ['deceased_name','deceasedName'],
      serviceDate:     ['service_date','serviceDate'],
      serviceTime:     ['service_time','serviceTime'],
      serviceDateTime: ['service_datetime','serviceDateTime'],
      serviceLocation: ['service_location','serviceLocation'],
      obituaryUrl:     ['obituary_url','obituaryUrl'],
      flowerOrder:     ['flower_order','flowerOrder']
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

    // Parent window data (same-origin only)
    if (!d.deceasedName && window.parent && window.parent !== window) {
      try {
        var po = window.parent.obituaryData || window.parent.obituaryFlowerContext;
        if (po && po.deceasedName) Object.keys(po).forEach(function(k){ if (!d[k]) d[k] = po[k]; });
      } catch(e) {}
    }

    // localStorage fallback (your existing script writes both keys)
    if (!d.deceasedName) {
      ['obituaryData','obituaryFlowerContext'].forEach(function(key){
        if (d.deceasedName) return;
        try {
          var stored = JSON.parse(localStorage.getItem(key) || '{}');
          if (stored && stored.deceasedName) {
            Object.keys(stored).forEach(function(k){ if (!d[k]) d[k] = stored[k]; });
          }
        } catch(e) {}
      });
    }
    return d;
  }

  /* ───────────────────────────────────────────────────────────────────────
     Scrape the GHL cart — mirrors your existing captureFlowerOrder
     selectors and also grabs the flower image. */
  function scrubName(s) {
    return String(s || '')
      .replace(/\$[\d,.]+/g, '')
      .replace(/\s*Qty\s*:?\s*\d+.*$/gi, '')
      .replace(/\s*\(Qty[^)]*\)/gi, '')
      .replace(/\s*Quantity\s*:?\s*\d+.*$/gi, '')
      .replace(/\s*x\s*\d+\s*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function captureCart() {
    var items = [];
    var selectors = [
      '.cart-item',
      '[data-cart-item]',
      '.product-item',
      '[class*="product"][class*="item"]',
      '.order-item',
      '.hl_order-bump--product'
    ];
    for (var s = 0; s < selectors.length; s++) {
      var nodes = document.querySelectorAll(selectors[s]);
      if (!nodes.length) continue;
      nodes.forEach(function (node) {
        var nameEl = node.querySelector('[class*="name"], [class*="title"], h3, h4, .product-name, strong');
        var name = nameEl ? scrubName(nameEl.textContent) : '';
        if (!name) return;
        var imgEl = node.querySelector('img');
        var img   = imgEl && imgEl.src ? imgEl.src : '';
        var sizeEl = node.querySelector('[class*="size"], [class*="option"], .variant');
        var size = sizeEl ? scrubName(sizeEl.textContent) : '';
        var qtyEl = node.querySelector('[class*="qty"], [class*="quantity"], input[type="number"]');
        var qty  = '';
        if (qtyEl) qty = (qtyEl.value || qtyEl.textContent || '').replace(/[^\d]/g,'') || '';
        items.push({ name: name, size: size, qty: qty, image: img });
      });
      if (items.length) break;
    }
    return items;
  }

  function formatItems(items) {
    if (!items.length) return '';
    return items.map(function(it){
      var base = it.size ? (it.name + ' — ' + it.size) : it.name;
      return it.qty && it.qty !== '1' ? (base + ' × ' + it.qty) : base;
    }).join(', ');
  }

  /* ─────────────────────────────────────────────────────────────────────── */
  var initialized = false;
  function init() {
    if (initialized) return;
    var wrap = document.getElementById('sfc-wrap');
    if (!wrap) return;

    var d = readData();
    if (!d.deceasedName) {
      console.warn('[SFC] no deceased name — form hidden');
      return;
    }

    var cart = captureCart();
    var flowerName  = formatItems(cart) || d.flowerOrder || '';
    var flowerImage = cart.length && cart[0].image ? cart[0].image : '';

    // If we don't have anything yet, keep waiting for cart to render
    if (!flowerName) return;

    initialized = true;

    document.getElementById('sfc-head-sub').textContent = 'In memory of ' + d.deceasedName;
    document.getElementById('sfc-flower').textContent = flowerName;
    if (cart.length && cart[0].size) {
      document.getElementById('sfc-flower-sub').textContent = cart[0].size + (cart[0].qty && cart[0].qty !== '1' ? ' • Qty ' + cart[0].qty : '');
    }

    if (flowerImage) {
      document.getElementById('sfc-hero-img-el').src = flowerImage;
      document.getElementById('sfc-hero-img').style.display = '';
    }

    var details = [];
    if (d.serviceDateTime || d.serviceDate) details.push('<div>📅 <span class="lbl">Service:</span> ' + (d.serviceDateTime || d.serviceDate) + '</div>');
    if (d.serviceLocation)                   details.push('<div>📍 <span class="lbl">Location:</span> ' + d.serviceLocation + '</div>');
    document.getElementById('sfc-details').innerHTML = details.join('');

    wrap.style.display = 'block';
    wire(d, flowerName, flowerImage);
  }

  function wire(d, flowerName, flowerImage) {
    var btn    = document.getElementById('sfc-btn');
    var status = document.getElementById('sfc-status');
    var email  = document.getElementById('sfc-email');
    var done   = false;

    btn.addEventListener('click', async function () {
      if (done) return;
      var addr = (email.value || '').trim();
      if (!addr || addr.indexOf('@') < 0) {
        status.textContent = 'Please enter your email address to confirm.';
        status.className   = 'err';
        email.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Confirming…';
      status.textContent = '';
      status.className   = '';

      try {
        var res = await fetch(API + '/api/ghl/update-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail:    addr,
            deceasedName:     d.deceasedName,
            serviceDate:      d.serviceDate || '',
            serviceDateTime:  d.serviceDateTime || '',
            serviceLocation:  d.serviceLocation || '',
            flowerOrder:      flowerName,
            flowerImage:      flowerImage || '',
            obituaryUrl:      d.obituaryUrl || ''
          })
        });
        var result = await res.json().catch(function(){ return {}; });
        if (!res.ok) throw new Error(result.error || ('HTTP ' + res.status));

        done = true;
        btn.textContent = '✓ Tribute Confirmed';
        btn.style.background = 'linear-gradient(135deg,#065f46 0%,#047857 100%)';
        btn.style.boxShadow  = '0 2px 6px rgba(6,95,70,0.3)';
        status.textContent = 'Your tribute is saved. Complete checkout below to publish it.';
        status.className   = 'ok';
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Confirm Flower Tribute';
        status.textContent = 'Something went wrong: ' + (err.message || 'please try again');
        status.className   = 'err';
        console.error('[SFC]', err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  [300, 900, 1800, 3500, 6000].forEach(function(t){ setTimeout(init, t); });
  if (window.MutationObserver) {
    new MutationObserver(function(){ if (!initialized) init(); }).observe(document.body, { childList:true, subtree:true });
  }
})();
</script>
