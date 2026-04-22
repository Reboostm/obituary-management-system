<!--
  ============================================================================
  FLOWER ORDER CONFIRMATION BLOCK — Paste into GHL Custom HTML element
  on the flower checkout page (above the GHL order form).

  Reads the deceased / service info in this priority order:
    1. URL params (?deceasedName=...&serviceDate=...&serviceLocation=...&obituaryUrl=...)
    2. window.parent.obituaryData (if same-origin parent set it)
    3. localStorage 'obituaryData' (only works if user came from same domain)

  The "Order Flowers" link on the obituary page MUST pass URL params, e.g.:
    https://your-checkout-page/?deceasedName=Otilia%20Polaco&serviceDate=...&obituaryUrl=...
  ============================================================================
-->

<style>
  #sfc-wrap{
    display:none;
    max-width:560px;
    margin:0 auto 24px;
    padding:20px 22px;
    font-family:Georgia,serif;
    color:#1f2937;
    background:#f9fafb;
    border:1px solid #e5e7eb;
    border-left:4px solid #d4af7f;
    border-radius:8px;
    box-sizing:border-box;
  }
  #sfc-wrap h3{
    margin:0 0 4px;
    font-size:18px;
    color:#1f2937;
    font-weight:600;
  }
  #sfc-name{
    margin:0 0 14px;
    font-size:15px;
    color:#6b7280;
  }
  #sfc-details > div{
    padding:6px 0;
    font-size:14px;
    line-height:1.45;
    color:#374151;
  }
  #sfc-details span{
    color:#6b7280;
    font-weight:600;
    margin-right:4px;
  }
  #sfc-email{
    width:100%;
    margin-top:14px;
    padding:10px 12px;
    font-size:14px;
    border:1px solid #d1d5db;
    border-radius:6px;
    box-sizing:border-box;
    font-family:inherit;
  }
  #sfc-email:focus{
    outline:none;
    border-color:#d4af7f;
    box-shadow:0 0 0 3px rgba(212,175,127,0.2);
  }
  #sfc-btn{
    width:100%;
    margin-top:10px;
    padding:11px 16px;
    font-size:15px;
    font-weight:600;
    color:#fff;
    background:#d4af7f;
    border:1px solid #c9a96e;
    border-radius:6px;
    cursor:pointer;
    transition:background 0.15s;
    font-family:inherit;
  }
  #sfc-btn:hover:not(:disabled){ background:#c9a96e; }
  #sfc-btn:disabled{ opacity:0.7; cursor:not-allowed; }
  #sfc-status{ margin-top:10px; font-size:13px; min-height:18px; }
  #sfc-status.ok{ color:#065f46; }
  #sfc-status.err{ color:#b91c1c; }
</style>

<div id="sfc-wrap">
  <h3>💐 Confirm your flower tribute</h3>
  <div id="sfc-name"></div>
  <div id="sfc-details"></div>
  <input id="sfc-email" type="email" placeholder="Your email address" autocomplete="email"/>
  <button id="sfc-btn" type="button">✓ Confirm Flower Order</button>
  <div id="sfc-status"></div>
</div>

<script>
(function () {
  var API = 'https://obituary-management-system.vercel.app';

  function readData() {
    var d = {};

    // 1. URL params (most reliable — survives cross-origin)
    try {
      var p = new URLSearchParams(window.location.search);
      ['deceasedName','serviceDate','serviceDateTime','serviceLocation','obituaryUrl','flowerOrder'].forEach(function(k){
        var v = p.get(k);
        if (v) d[k] = v;
      });
    } catch(e) {}

    // 2. Parent window data (works only if same-origin)
    if (!d.deceasedName && window.parent && window.parent !== window) {
      try {
        if (window.parent.obituaryData && window.parent.obituaryData.deceasedName) {
          Object.assign(d, window.parent.obituaryData);
        }
      } catch(e) {}
    }

    // 3. localStorage fallback
    if (!d.deceasedName) {
      try {
        var stored = JSON.parse(localStorage.getItem('obituaryData') || '{}');
        Object.keys(stored).forEach(function(k){ if (!d[k]) d[k] = stored[k]; });
      } catch(e) {}
    }

    return d;
  }

  function cleanName(raw) {
    return String(raw || '')
      .replace(/\s*Qty\s*:?\s*\d+.*$/gi, '')
      .replace(/\s*\(Qty[^)]*\)/gi, '')
      .replace(/\s*Quantity\s*:?\s*\d+.*$/gi, '')
      .replace(/\s*x\s*\d+\s*$/gi, '')
      .trim();
  }

  function getFlowers(fallback) {
    var flowers = [];
    var selectors = [
      '.product-name-container', '.order-product-name', '.cart-item-name',
      '.product-name', '[data-product-name]', '.line-item-name',
      '.hl_order-bump--product-name'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      nodes.forEach(function(el){
        var t = cleanName(el.textContent);
        if (t && flowers.indexOf(t) === -1) flowers.push(t);
      });
      if (flowers.length) break;
    }
    if (!flowers.length) {
      var fb = document.querySelector(
        '.cart-summary .title, .order-summary .title, .line-item h3, .cart-item h3, .product-title'
      );
      if (fb) flowers.push(cleanName(fb.textContent));
    }
    return flowers.length ? flowers.join(', ') : (fallback || 'Flower Arrangement');
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    var wrap = document.getElementById('sfc-wrap');
    if (!wrap) return; // Block hasn't loaded yet

    var d = readData();
    if (!d.deceasedName) {
      console.warn('[SFC] No deceased name found in URL params, parent, or localStorage. Form will not render.');
      return;
    }
    initialized = true;

    var flowers = getFlowers(d.flowerOrder);

    document.getElementById('sfc-name').textContent = 'In memory of ' + d.deceasedName;

    var html = '';
    if (flowers) html += '<div>🌸 <span>Flowers:</span> ' + flowers + '</div>';
    if (d.serviceDateTime || d.serviceDate)
      html += '<div>📅 <span>Service:</span> ' + (d.serviceDateTime || d.serviceDate) + '</div>';
    if (d.serviceLocation)
      html += '<div>📍 <span>Location:</span> ' + d.serviceLocation + '</div>';
    document.getElementById('sfc-details').innerHTML = html;

    wrap.style.display = 'block';
    setupButton(flowers, d);
  }

  function setupButton(flowers, d) {
    var btn        = document.getElementById('sfc-btn');
    var status     = document.getElementById('sfc-status');
    var emailInput = document.getElementById('sfc-email');
    var confirmed  = false;

    btn.addEventListener('click', async function () {
      if (confirmed) return;
      var email = emailInput.value.trim();
      if (!email || email.indexOf('@') < 0) {
        status.textContent = '⚠️ Please enter your email address to confirm.';
        status.className   = 'err';
        emailInput.focus();
        return;
      }

      btn.disabled    = true;
      btn.textContent = '⏳ Confirming…';
      status.textContent = '';
      status.className   = '';

      try {
        var res = await fetch(API + '/api/ghl/update-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail:    email,
            deceasedName:     d.deceasedName,
            serviceDate:      d.serviceDate || '',
            serviceDateTime:  d.serviceDateTime || '',
            serviceLocation:  d.serviceLocation || '',
            flowerOrder:      flowers,
            obituaryUrl:      d.obituaryUrl || '',
          })
        });
        var result = await res.json().catch(function(){ return {}; });
        if (!res.ok) throw new Error(result.error || ('HTTP ' + res.status));

        confirmed             = true;
        btn.textContent       = '✓ Details Confirmed';
        btn.style.background  = '#065f46';
        btn.style.borderColor = '#047857';
        status.textContent = 'Your tribute is saved. Complete checkout below to publish it.';
        status.className   = 'ok';
      } catch (err) {
        btn.disabled    = false;
        btn.textContent = '✓ Confirm Flower Order';
        status.textContent = '⚠️ Something went wrong: ' + (err.message || 'please try again');
        status.className   = 'err';
        console.error('[SFC]', err);
      }
    });
  }

  // Try multiple times — GHL renders the cart asynchronously
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  [400, 1200, 2500, 5000].forEach(function(t){ setTimeout(init, t); });
})();
</script>
