import { Resend } from 'resend';
import { loadNotificationSettings } from './notificationSettings';

const DEFAULT_FROM = 'noreply@didericksenmemorialfuneralservices.com';

function getResend(apiKey) {
  const key = apiKey || process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured (env var or dashboard settings)');
  }
  return new Resend(key);
}

export async function sendEmail({ to, subject, html, from, apiKey }) {
  const resend = getResend(apiKey);
  const fromAddr = from || DEFAULT_FROM;
  try {
    const result = await resend.emails.send({
      from: fromAddr,
      to,
      subject,
      html,
    });
    if (result?.error) {
      console.error('Resend returned error:', JSON.stringify(result.error));
      throw new Error(result.error.message || 'Resend send failed');
    }
    return result;
  } catch (error) {
    console.error('Resend email error:', error?.message || error);
    throw error;
  }
}

function renderImageGallery(images, flowerName) {
  if (!images || !images.length) return '';
  if (images.length === 1) {
    return `<div style="margin:0 0 20px 0;text-align:center;">
      <img src="${images[0]}" alt="${flowerName || ''}" style="max-width:280px;max-height:280px;border-radius:8px;border:1px solid #d1d5db;">
    </div>`;
  }
  const cells = images.map(img =>
    `<td style="width:${100 / images.length}%;padding:4px;" align="center" valign="top">
       <img src="${img}" alt="${flowerName || ''}" style="width:100%;max-width:240px;height:auto;border-radius:8px;border:1px solid #d1d5db;">
     </td>`
  ).join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 20px 0;"><tr>${cells}</tr></table>`;
}

export async function sendDirectorFlowerOrderNotification({
  directorEmail,
  deceasedName,
  customerName,
  customerEmail,
  flowerName,
  flowerImage,
  flowerImages,
  serviceDate,
  serviceTime,
  serviceLocation,
  orderTotal,
  pendingPayment = false,
  from,
  apiKey,
}) {
  const images = (Array.isArray(flowerImages) && flowerImages.length)
    ? flowerImages
    : (flowerImage ? [flowerImage] : []);

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #c9a96e 0%, #d4af7f 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">💐 ${pendingPayment ? 'Flower Order — Awaiting Payment' : 'Flower Order Confirmed'}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">

        ${pendingPayment ? `
        <div style="background: #fef3cd; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⏳ Awaiting Payment — Customer is at checkout. The Memory Wall entry will go live once payment is confirmed.</p>
        </div>` : ''}

        ${renderImageGallery(images, flowerName)}

        <p style="margin-top: 0;"><strong>For:</strong> ${deceasedName}</p>
        <p><strong>Customer:</strong> ${customerName || 'Unknown'}${customerEmail ? ` &lt;${customerEmail}&gt;` : ''}</p>
        <p><strong>Flowers:</strong> ${flowerName || 'Flower Arrangement'}</p>
        ${orderTotal ? `<p><strong>Order Total:</strong> $${orderTotal}</p>` : ''}

        ${serviceDate ? `<p><strong>Service Date:</strong> ${serviceDate}${serviceTime ? ' at ' + serviceTime : ''}</p>` : ''}
        ${serviceLocation ? `<p><strong>Location:</strong> ${serviceLocation}</p>` : ''}

        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1d5db;">
          <a href="https://obituary-management-system.vercel.app/dashboard" style="background: #d4af7f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Dashboard</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: directorEmail,
    subject: `💐 ${pendingPayment ? '[Pending Payment] ' : ''}Flower Order for ${deceasedName}`,
    html,
    from,
    apiKey,
  });
}

export async function sendFloralShopOrderEmail({
  floralShopEmail,
  floralShopName,
  deceasedName,
  customerName,
  customerEmail,
  customerPhone,
  flowerName,
  flowerImage,
  flowerImages,
  serviceDate,
  serviceTime,
  serviceLocation,
  deliveryAddress,
  orderNotes,
  orderTotal,
  pendingPayment = false,
  from,
  apiKey,
}) {
  const images = (Array.isArray(flowerImages) && flowerImages.length)
    ? flowerImages
    : (flowerImage ? [flowerImage] : []);

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #c9a96e 0%, #d4af7f 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">💐 ${pendingPayment ? 'Incoming Flower Order — Awaiting Payment' : 'New Flower Order'}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">

        ${pendingPayment ? `
        <div style="background: #fef3cd; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⏳ Please DO NOT fulfill this order yet — payment is still being processed. You will receive a confirmation once payment is complete.</p>
        </div>` : ''}

        <h2 style="color: #1f2937; margin-top: 0;">Order Details</h2>

        ${renderImageGallery(images, flowerName)}

        <p><strong>Arrangement:</strong> ${flowerName}</p>

        <h3 style="color: #374151; margin-top: 20px;">Deceased Information</h3>
        <p style="margin: 8px 0;"><strong>Name:</strong> ${deceasedName}</p>
        ${serviceDate ? `<p style="margin: 8px 0;"><strong>Service Date:</strong> ${serviceDate}${serviceTime ? ' at ' + serviceTime : ''}</p>` : ''}
        ${serviceLocation ? `<p style="margin: 8px 0;"><strong>Service Location:</strong> ${serviceLocation}</p>` : ''}

        <h3 style="color: #374151; margin-top: 20px;">Customer Information</h3>
        <p style="margin: 8px 0;"><strong>Name:</strong> ${customerName}</p>
        ${customerEmail ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${customerEmail}</p>` : ''}
        ${customerPhone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> ${customerPhone}</p>` : ''}

        ${deliveryAddress ? `<h3 style="color: #374151; margin-top: 20px;">Delivery Address</h3>
        <p style="margin: 0; white-space: pre-wrap;">${deliveryAddress}</p>` : ''}

        ${orderNotes ? `<h3 style="color: #374151; margin-top: 20px;">Flowers Ordered</h3>
        <p style="margin: 0; white-space: pre-wrap;">${orderNotes}</p>` : ''}

        ${orderTotal ? `<div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #d1d5db;">
          <p style="font-size: 18px; font-weight: bold; color: #1f2937;">Order Total: $${orderTotal}</p>
        </div>` : ''}

        <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #d4af7f; border-radius: 4px;">
          <p style="margin: 0; color: #856404;"><strong>Questions?</strong> Contact Didericksen Memorial Funeral Services<br>📞 (435) 277-0050<br>📧 jr@didericksenmemorial.com</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: floralShopEmail,
    subject: `${pendingPayment ? '[Pending Payment] ' : ''}Flower Order: ${deceasedName} - ${flowerName}`,
    html,
    from,
    apiKey,
  });
}

// Re-export so other code can grab settings if needed
export { loadNotificationSettings };
