/**
 * GHL Flower Order Webhook
 * Receives flower orders from GoHighLevel and:
 * 1. Sends email to director (notification)
 * 2. Sends email to selected floral shop (order details)
 * 3. Creates memory entry on obituary Memory Wall
 */

import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { sendDirectorFlowerOrderNotification, sendFloralShopOrderEmail } from '../../../lib/resend';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orderData = req.body;
    const sendEmails = orderData.sendEmails !== false; // Default true, but can be overridden
    const isPaymentConfirmed = orderData.paymentConfirmed || sendEmails; // If from GHL, payment is confirmed

    console.log('🔍 WEBHOOK RECEIVED - Send Emails:', sendEmails, '| Payment Confirmed:', isPaymentConfirmed);
    console.log('📦 DATA:', JSON.stringify(orderData, null, 2));

    // ===============================
    // EXTRACT DATA FROM SPECIAL MESSAGE
    // ===============================
    let deceasedName = orderData.deceasedName || orderData.contact?.first_name || '';
    let serviceDate = '';
    let serviceTime = '';
    let serviceLocation = '';
    let flowerOrder = '';
    let obituaryUrl = '';

    // Parse special message/notes if present
    const specialMessage = orderData.specialInstructions || orderData.notes || orderData.orderNotes || '';
    if (specialMessage && specialMessage.includes('FLOWERS FOR:')) {
      console.log('📝 PARSING SPECIAL MESSAGE');

      // Extract deceased name
      const deceasedMatch = specialMessage.match(/FLOWERS FOR:\s*(.+?)(?:\n|Service:)/);
      if (deceasedMatch) {
        deceasedName = deceasedMatch[1].trim();
        console.log('👤 Deceased:', deceasedName);
      }

      // Extract service date/time
      const serviceMatch = specialMessage.match(/Service:\s*(.+?)(?:\n|Location:)/);
      if (serviceMatch) {
        const serviceStr = serviceMatch[1].trim();
        console.log('📅 Service:', serviceStr);
        // Try to parse date/time
        if (serviceStr.includes('at')) {
          const parts = serviceStr.split('at');
          serviceDate = parts[0].trim();
          serviceTime = parts[1]?.trim() || '';
        } else {
          serviceDate = serviceStr;
        }
      }

      // Extract location
      const locationMatch = specialMessage.match(/Location:\s*(.+?)(?:\n|Obituary:)/);
      if (locationMatch) {
        serviceLocation = locationMatch[1].trim();
        console.log('📍 Location:', serviceLocation);
      }

      // Extract obituary URL
      const obituaryMatch = specialMessage.match(/Obituary:\s*(.+?)(?:\n|FLOWER ORDER:|$)/);
      if (obituaryMatch) {
        obituaryUrl = obituaryMatch[1].trim();
        console.log('🔗 Obituary URL:', obituaryUrl);
      }

      // Extract flower order
      const flowerMatch = specialMessage.match(/FLOWER ORDER:([\s\S]*?)$/);
      if (flowerMatch) {
        flowerOrder = flowerMatch[1].trim();
        console.log('💐 Flower Order:', flowerOrder);
      }
    }

    // Fallback: get customer info from contact
    const customerName = orderData.contact?.first_name && orderData.contact?.last_name
      ? `${orderData.contact.first_name} ${orderData.contact.last_name}`
      : orderData.customerName || 'Anonymous';
    const customerEmail = orderData.contact?.email || orderData.customerEmail || '';
    const customerPhone = orderData.contact?.phone || orderData.customerPhone || '';
    const orderTotal = orderData.orderTotal || orderData.total || '';
    const flowerImage = orderData.productImage || orderData.flowerImage || null;
    const deliveryAddress = orderData.deliveryAddress || '';

    if (!deceasedName) {
      console.error('❌ No deceased name found');
      return res.status(400).json({ error: 'Deceased name required' });
    }

    console.log('✅ DATA EXTRACTED:', {
      deceasedName,
      serviceDate,
      serviceTime,
      serviceLocation,
      customerName,
      customerEmail,
      flowerOrder
    });

    // Find the obituary by deceased name
    let obituaryId = null;
    let obituary = null;
    try {
      const q = query(
        collection(db, 'obituaries'),
        where('fullName', '==', deceasedName)
      );
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        obituary = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        obituaryId = obituary.id;
      }
    } catch (err) {
      console.error('Error finding obituary:', err);
    }

    if (!obituaryId) {
      return res.status(400).json({ error: `Obituary not found for: ${deceasedName}` });
    }

    // Get floral shop info if selected
    let floralShop = null;
    if (obituary.selectedFloralShopId) {
      try {
        const shopRef = doc(db, 'floralShops', obituary.selectedFloralShopId);
        const shopSnap = await getDoc(shopRef);
        if (shopSnap.exists()) {
          floralShop = { id: shopSnap.id, ...shopSnap.data() };
        }
      } catch (err) {
        console.error('Error fetching floral shop:', err);
      }
    }

    // Get floral shop info if selected
    // If we found the obituary, use service info from there
    // Otherwise use parsed data from special message
    if (!serviceDate && obituary.services) {
      const primaryService = obituary.services.find(s => s.type === 'Funeral Service') || obituary.services[0] || {};
      if (primaryService.date) serviceDate = primaryService.date;
      if (primaryService.time) serviceTime = primaryService.time;
      if (primaryService.location) serviceLocation = primaryService.location;
    }

    // Get director email
    const DIRECTOR_EMAIL = 'marketingreboost@gmail.com';

    // Format flower order for email
    const flowerNameForEmail = flowerOrder || 'Flower Arrangement';

    // ===============================
    // SEND EMAILS ONLY IF PAYMENT CONFIRMED
    // ===============================
    if (sendEmails && isPaymentConfirmed) {
      // Send email to director
      try {
        await sendDirectorFlowerOrderNotification({
          directorEmail: DIRECTOR_EMAIL,
          deceasedName,
          customerName,
          flowerName: flowerNameForEmail,
          serviceDate,
          serviceTime,
          serviceLocation,
        });
        console.log('✉️ Director email sent to:', DIRECTOR_EMAIL);
      } catch (err) {
        console.error('Failed to send director email:', err);
      }

      // Send email to floral shop if selected
      if (floralShop && floralShop.email) {
        try {
          await sendFloralShopOrderEmail({
            floralShopEmail: floralShop.email,
            floralShopName: floralShop.name,
            deceasedName,
            customerName,
            customerEmail,
            customerPhone,
            flowerName: flowerNameForEmail,
            flowerImage,
            serviceDate,
            serviceTime,
            serviceLocation,
            deliveryAddress,
            orderNotes: flowerOrder,
            orderTotal,
          });
          console.log('✉️ Floral shop email sent to:', floralShop.email);
        } catch (err) {
          console.error('Failed to send floral shop email:', err);
        }
      } else {
        console.warn('⚠️ No floral shop configured for this obituary');
      }
    } else {
      console.log('⏳ Emails NOT sent yet - waiting for payment confirmation');
    }

    // ===============================
    // CREATE MEMORY ENTRY
    // Published only if payment confirmed
    // ===============================
    try {
      const memoryEntry = {
        obituaryId,
        name: customerName,
        relationship: 'Flower Order',
        memoryText: `Sent ${flowerNameForEmail} as a tribute to ${deceasedName}`,
        createdAt: new Date(),
        published: isPaymentConfirmed, // Only publish if payment confirmed
        isFlowerOrder: true,
        flowerName: flowerNameForEmail,
        flowerImage,
        orderTotal,
        paymentConfirmed: isPaymentConfirmed, // Track payment status
      };

      const memoryRef = collection(db, 'memories');
      const docRef = await addDoc(memoryRef, memoryEntry);

      const status = isPaymentConfirmed ? '✅ published' : '⏳ draft (waiting for payment)';
      console.log('💐 Memory entry created:', docRef.id, '|', status);
    } catch (err) {
      console.error('Failed to create memory entry:', err);
    }

    // Return success
    return res.status(200).json({
      success: true,
      obituaryId,
      deceased: deceasedName,
      customer: customerName,
      floralShopNotified: !!floralShop,
      emailsSent: {
        director: true,
        floralShop: !!floralShop,
      },
      memoryCreated: true,
      message: `✅ Flower order for ${deceasedName} processed successfully`,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process order',
      message: error.message,
    });
  }
}
