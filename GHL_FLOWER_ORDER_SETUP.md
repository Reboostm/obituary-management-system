# GHL Flower Order — Complete Setup Guide

This is the full setup for the flower-order pipeline. You'll touch three places:

1. **Obituary page** (didericksenmemorialfuneralservices.com)
2. **GHL flower checkout page** (Custom HTML block)
3. **GHL Workflow → Webhook action** (this is what's been silently breaking the customer name / email / order total)

---

## 1. Obituary Page — capture data + rewrite the "Order Flowers" link

Paste the contents of `obituary-page-flower-link.html` into a Custom HTML element on the obituary page, **after** the obituary embed iframe.

It does three things:
- Listens for the `rbObituaryData` postMessage from the embed iframe
- Stores it in `localStorage` (fallback)
- Finds every "Order Flowers" / "Send Flowers" anchor and appends URL params to its `href`

The link itself can be any anchor tag. The script auto-detects it if any of these are true:
- It has class `rb-flower-link`
- It has attribute `data-flower-link="true"`
- Its text contains "Order Flower" or "Send Flower" (case-insensitive)

After the script runs, the link will look like:
```
https://your-ghl-checkout/?deceasedName=Otilia%20Polaco&serviceDate=...&serviceLocation=...&obituaryUrl=...
```

---

## 2. GHL Flower Checkout Page — confirmation form

Paste the contents of `flower-confirmation-script.js` into a Custom HTML block **above** the GHL order form.

It will:
1. Read the deceased / service info from URL params (and fall back to localStorage / parent window if running on the same domain)
2. Display a confirmation box showing the customer what they're ordering and for whom
3. Capture the customer's email
4. POST to `/api/ghl/update-contact` to:
   - Update the GHL contact's custom fields with deceased / service info
   - Create a draft memory in Firebase (unpublished, awaiting payment)

If the form does **not** appear, open the browser console — the script logs why (usually: no deceased name in URL, parent, or localStorage).

---

## 3. GHL Workflow — Order Submitted → Send Webhook

**This is the step that fixes:** "A caring friend" sender name, empty `customerEmail`, empty `orderTotal`.

In GHL:
1. Open the **Workflow** that fires after a successful flower order payment.
2. Make sure the trigger is **Order Submitted** (or **Order Form Submitted**) — not "Form Submitted".
3. Add (or edit) the **Send Webhook** action with the settings below.

### Webhook URL
```
https://obituary-management-system.vercel.app/api/webhook/ghl-flower-order
```

### Method
`POST`

### Headers
| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

### Body — paste this exact JSON, then map the merge tags using GHL's Custom Value picker

```json
{
  "customerName": "{{contact.name}}",
  "customerEmail": "{{contact.email}}",
  "contact": {
    "firstName": "{{contact.first_name}}",
    "lastName": "{{contact.last_name}}",
    "email": "{{contact.email}}",
    "phone": "{{contact.phone}}"
  },
  "productName": "{{order.products.name}}",
  "productImage": "{{order.products.image}}",
  "orderTotal": "{{order.total}}"
}
```

> **Important:** GHL's exact merge-tag syntax for order fields varies by location. When you click into the body field in GHL, use the **{} Custom Value** picker → search for "order" / "product" and pick whatever GHL exposes for product name, product image, and order total. The webhook accepts several aliases (`productName`/`product_name`, `orderTotal`/`total`, `productImage`/`product_image`/`flowerImage`) so don't worry if the names differ slightly.

### How to verify it's working

After a test purchase, check the **Vercel logs** for the `/api/webhook/ghl-flower-order` function. You should see:

```
🔍 WEBHOOK - Source: GHL Payment
👤 Customer: John Smith | john@example.com
🌸 Product from GHL: Rose Arrangement
🔍 Pending flower orders found: 1
✅ Matched by customer email: Otilia (Tillie) Polaco
⚙️ Settings loaded — directors: marketingreboost@gmail.com | from: noreply@didericksenmemorialfuneralservices.com
✉️ Director email sent to: marketingreboost@gmail.com
✉️ Floral shop email sent to: shop@example.com
✅ Memory published: <id>
```

If `Customer: A caring friend` shows up, the merge tag for `{{contact.name}}` isn't resolving — try `{{contact.first_name}} {{contact.last_name}}` instead, or pick the merge tag from GHL's picker rather than typing it.

---

## 4. Dashboard → Notification Settings

In the OMS dashboard, open **Notification Settings** and confirm:
- **Director Emails:** `marketingreboost@gmail.com` (comma-separate to add more)
- **From Address:** `noreply@didericksenmemorialfuneralservices.com` (the verified domain)
- **Resend API Key:** can be left blank if `RESEND_API_KEY` is set in Vercel env vars

These settings drive **both** flower-order notifications and spam-memory alerts.

---

## 5. Vercel Environment Variables

Add (or confirm) these in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | `re_...` (from resend.com) |
| `GHL_API_KEY` | `pit-...` (from GHL) |
| `GHL_LOCATION_ID` | `8Z8DYXwo6cwCrx91szgq` |

The hardcoded values currently in source still work as fallbacks, but env vars take precedence and let you rotate keys without redeploying.

---

## End-to-end test checklist

- [ ] Obituary page loads, "Order Flowers" link includes `?deceasedName=...` after page load (inspect the `href` in DevTools)
- [ ] Click link → checkout page → confirmation box appears with deceased name + service info
- [ ] Enter email → click Confirm → button turns green
- [ ] Check Firebase: a new doc in `memories` with `paymentConfirmed: false`, `published: false`, `customerEmail` populated
- [ ] Complete GHL checkout payment
- [ ] Vercel logs show `✉️ Director email sent` and `✅ Memory published`
- [ ] Director inbox has the email, with customer name, order total, and flower image
- [ ] Memory wall on the obituary page shows the flower card with image, arrangement name, and sender name
