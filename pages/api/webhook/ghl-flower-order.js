/**
 * GHL Flower Order Webhook
 * Two paths:
 * 1. Button click (sendEmails: false) → store pending order, create draft memory, send "pending payment" emails
 * 2. GHL webhook after payment → find draft memory by deceasedName, publish it
 */

import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { sendDirectorFlowerOrderNotification, sendFloralShopOrderEmail } from '../../../lib/resend';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orderData = req.body;
    const isButtonClick = orderData.source === 'button'; // From confirm button
    const isGHLWebhook = !isButtonClick; // From GHL after payment

    console.log('🔍 WEBHOOK RECEIVED - Source:', isButtonClick ? 'Button Click' : 'GHL Webhook');
    console.log('📦 DATA:', JSON.stringify(orderData, null, 2));

    // ===============================
    // PATH 1: BUTTON CLICK
    // Has all the data, send emails, create draft memory
    // ===============================
    if (isButtonClick) {
      const deceasedName = orderData.deceasedName || '';
      const serviceDate = orderData.serviceDate || '';
      const serviceTime = orderData.serviceTime || '';
      const serviceDateTime = orderData.serviceDateTime || '';
      const serviceLocation = orderData.serviceLocation || '';
      const flowerOrder = orderData.flowerOrder || '';
      const obituaryUrl = orderData.obituaryUrl || '';
      const customerName = orderData.customerName || 'A caring friend';
      const customerEmail = orderData.customerEmail || '';

      if (!deceasedName) {
        return res.status(400).json({ error: 'Deceased name required' });
      }

      // Find obituary
      let obituaryId = null;
      let obituary = null;
      try {
        const q = query(collection(db, 'obituaries'), where('fullName', '==', deceasedName));
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

      // Get floral shop
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

      const DIRECTOR_EMAIL = 'marketingreboost@gmail.com';
      const flowerNameForEmail = flowerOrder || 'Flower Arrangement';
      const serviceDateForEmail = serviceDateTime || serviceDate || '';

      // Send director email (pending payment notification)
      try {
        await sendDirectorFlowerOrderNotification({
          directorEmail: DIRECTOR_EMAIL,
          deceasedName,
          customerName,
          flowerName: flowerNameForEmail,
          serviceDate: serviceDateForEmail,
          serviceTime,
          serviceLocation,
          pendingPayment: true,
        });
        console.log('✉️ Director email sent (pending payment)');
      } catch (err) {
        console.error('Failed to send director email:', err);
      }

      // Send floral shop email (pending payment)
      if (floralShop && floralShop.email) {
        try {
          await sendFloralShopOrderEmail({
            floralShopEmail: floralShop.email,
            floralShopName: floralShop.name,
            deceasedName,
            customerName,
            customerEmail,
            customerPhone: '',
            flowerName: flowerNameForEmail,
            flowerImage: null,
            serviceDate: serviceDateForEmail,
            serviceTime,
            serviceLocation,
            deliveryAddress: '',
            orderNotes: `Flowers: ${flowerOrder}`,
            orderTotal: '',
            pendingPayment: true,
          });
          console.log('✉️ Floral shop email sent (pending payment)');
        } catch (err) {
          console.error('Failed to send floral shop email:', err);
        }
      }

      // Create DRAFT memory entry (not published until payment confirmed)
      let memoryId = null;
      try {
        const memoryEntry = {
          obituaryId,
          name: customerName,
          relationship: 'Flower Order',
          memoryText: `Sent ${flowerNameForEmail} as a tribute to ${deceasedName}`,
          createdAt: new Date(),
          published: false, // DRAFT until payment confirmed
          isFlowerOrder: true,
          flowerName: flowerNameForEmail,
          flowerImage: null,
          orderTotal: '',
          deceasedName, // Store for GHL webhook lookup
          paymentConfirmed: false,
        };
        const memoryRef = collection(db, 'memories');
        const docRef = await addDoc(memoryRef, memoryEntry);
        memoryId = docRef.id;
        console.log('💐 Draft memory created:', memoryId);
      } catch (err) {
        console.error('Failed to create draft memory:', err);
      }

      return res.status(200).json({
        success: true,
        obituaryId,
        memoryId,
        deceased: deceasedName,
        emailsSent: true,
        pendingPayment: true,
        message: `Order for ${deceasedName} stored. Emails sent as pending. Memory will publish after payment.`,
      });
    }

    // ===============================
    // PATH 2: GHL WEBHOOK AFTER PAYMENT
    // Now has deceased name from custom fields!
    // Send emails + publish memory
    // ===============================
    if (isGHLWebhook) {
      console.log('💳 GHL Payment confirmed - processing order');

      const deceasedName = orderData.deceasedName || '';
      const serviceDate = orderData.serviceDate || '';
      const serviceLocation = orderData.serviceLocation || '';
      const flowerOrder = orderData.flowerOrder || '';
      const customerName = orderData.contact?.first_name && orderData.contact?.last_name
        ? `${orderData.contact.first_name} ${orderData.contact.last_name}`
        : orderData.customerName || 'A caring friend';
      const customerEmail = orderData.contact?.email || orderData.customerEmail || '';
      const customerPhone = orderData.contact?.phone || orderData.customerPhone || '';
      const orderTotal = orderData.orderTotal || orderData.total || '';

      console.log('✅ Deceased:', deceasedName, '| Customer:', customerName);

      if (!deceasedName) {
        console.error('❌ Still no deceased name from GHL');
        return res.status(400).json({ error: 'Deceased name required' });
      }

      // Find obituary
      let obituaryId = null;
      let obituary = null;
      try {
        const q = query(collection(db, 'obituaries'), where('fullName', '==', deceasedName));
        const snapshot = await getDocs(q);
        if (snapshot.docs.length > 0) {
          obituary = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          obituaryId = obituary.id;
          console.log('✅ Found obituary:', obituaryId);
        }
      } catch (err) {
        console.error('Error finding obituary:', err);
      }

      // Get floral shop
      let floralShop = null;
      if (obituary?.selectedFloralShopId) {
        try {
          const shopRef = doc(db, 'floralShops', obituary.selectedFloralShopId);
          const shopSnap = await getDoc(shopRef);
          if (shopSnap.exists()) {
            floralShop = { id: shopSnap.id, ...shopSnap.data() };
            console.log('✅ Found floral shop:', floralShop.name);
          }
        } catch (err) {
          console.error('Error fetching floral shop:', err);
        }
      }

      const DIRECTOR_EMAIL = 'marketingreboost@gmail.com';
      const flowerNameForEmail = flowerOrder || 'Flower Arrangement';

      // Send director email - PAYMENT CONFIRMED
      try {
        await sendDirectorFlowerOrderNotification({
          directorEmail: DIRECTOR_EMAIL,
          deceasedName,
          customerName,
          flowerName: flowerNameForEmail,
          serviceDate,
          serviceTime: '',
          serviceLocation,
          pendingPayment: false,
        });
        console.log('✉️ Director email sent - payment confirmed');
      } catch (err) {
        console.error('Failed to send director email:', err);
      }

      // Send floral shop email - PAYMENT CONFIRMED
      if (floralShop?.email) {
        try {
          await sendFloralShopOrderEmail({
            floralShopEmail: floralShop.email,
            floralShopName: floralShop.name,
            deceasedName,
            customerName,
            customerEmail,
            customerPhone,
            flowerName: flowerNameForEmail,
            flowerImage: null,
            serviceDate,
            serviceTime: '',
            serviceLocation,
            deliveryAddress: '',
            orderNotes: flowerOrder,
            orderTotal,
            pendingPayment: false,
          });
          console.log('✉️ Floral shop email sent - payment confirmed');
        } catch (err) {
          console.error('Failed to send floral shop email:', err);
        }
      }

      // Publish draft memory OR create new one if button wasn't clicked
      if (obituaryId) {
        try {
          // First try to find and publish draft
          const q = query(
            collection(db, 'memories'),
            where('deceasedName', '==', deceasedName),
            where('paymentConfirmed', '==', false),
            where('isFlowerOrder', '==', true)
          );
          const snapshot = await getDocs(q);

          if (snapshot.docs.length > 0) {
            // Publish existing draft
            await updateDoc(doc(db, 'memories', snapshot.docs[0].id), {
              published: true,
              paymentConfirmed: true,
              orderTotal,
              name: customerName,
            });
            console.log('✅ Draft memory published:', snapshot.docs[0].id);
          } else {
            // No draft found - create fresh published memory
            await addDoc(collection(db, 'memories'), {
              obituaryId,
              name: customerName,
              relationship: 'Flower Order',
              memoryText: `Sent ${flowerNameForEmail} as a tribute to ${deceasedName}`,
              createdAt: new Date(),
              published: true,
              isFlowerOrder: true,
              flowerName: flowerNameForEmail,
              flowerImage: null,
              orderTotal,
              deceasedName,
              paymentConfirmed: true,
            });
            console.log('✅ New memory created and published');
          }
        } catch (err) {
          console.error('Failed to publish memory:', err);
        }
      }

      return res.status(200).json({
        success: true,
        deceased: deceasedName,
        customer: customerName,
        emailsSent: true,
        memoryPublished: true,
        message: `✅ Payment confirmed. Emails sent. Memory wall updated for ${deceasedName}.`,
      });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process order',
      message: error.message,
    });
  }
}
