import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, from = 'noreply@didericksenmemorial.com' }) {
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    return result;
  } catch (error) {
    console.error('Resend email error:', error);
    throw error;
  }
}

export async function sendDirectorFlowerOrderNotification({ directorEmail, deceasedName, customerName, flowerName, serviceDate, serviceTime, serviceLocation, pendingPayment = false }) {
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

        <p style="margin-top: 0;"><strong>For:</strong> ${deceasedName}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Flowers:</strong> ${flowerName}</p>

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
  });
}

export async function sendFloralShopOrderEmail({ floralShopEmail, floralShopName, deceasedName, customerName, customerEmail, customerPhone, flowerName, flowerImage, serviceDate, serviceTime, serviceLocation, deliveryAddress, orderNotes, orderTotal, pendingPayment = false }) {
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

        ${flowerImage ? `<div style="margin: 20px 0; text-align: center;">
          <img src="${flowerImage}" alt="${flowerName}" style="max-width: 300px; max-height: 300px; border-radius: 8px; border: 1px solid #d1d5db;">
        </div>` : ''}

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
  });
}
