/**
 * GHL Flower Order Webhook
 *
 * PATH 1 — Button click (source === 'button')
 *   Stores all order data in Firebase as a pending draft memory.
 *   No emails sent yet.
 *
 * PATH 2 — GHL Order Submitted webhook (after payment)
 *   Finds the pending Firebase record (deceased info already stored there).
 *   Sends emails to director + floral shop.
 *   Publishes the memory wall entry.
 *   No need to pass deceased name through GHL at all.
 */

import { db } from '../../../lib/firebase';
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, updateDoc, orderBy, limit,
} from 'firebase/firestore';
import { sendDirectorFlowerOrderNotification, sendFloralShopOrderEmail } from '../../../lib/resend';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const orderData = req.body;
    const isButtonClick = orderData.source === 'button';

    console.log('🔍 WEBHOOK - Source:', isButtonClick ? 'Button Click' : 'GHL Payment');
    console.log('📦 DATA:', JSON.stringify(orderData, null, 2));

    // =========================================================
    // PATH 1: BUTTON CLICK — store everything in Firebase
    // =========================================================
    if (isButtonClick) {
      const deceasedName    = orderData.deceasedName    || '';
      const serviceDate     = orderData.serviceDate     || '';
      const serviceDateTime = orderData.serviceDateTime || '';
      const serviceLocation = orderData.serviceLocation || '';
      const flowerOrder     = orderData.flowerOrder     || '';
      const obituaryUrl     = orderData.obituaryUrl     || '';
      const customerName    = orderData.customerName    || 'A caring friend';
      const customerEmail   = orderData.customerEmail   || '';

      if (!deceasedName) return res.status(400).json({ error: 'Deceased name required' });

      // Find obituary
      let obituaryId = null;
      let obituary   = null;
      try {
        const q = query(collection(db, 'obituaries'), where('fullName', '==', deceasedName));
        const snap = await getDocs(q);
        if (snap.docs.length > 0) {
          obituary   = { id: snap.docs[0].id, ...snap.docs[0].data() };
          obituaryId = obituary.id;
        }
      } catch (err) { console.error('Error finding obituary:', err); }

      if (!obituaryId) return res.status(400).json({ error: `Obituary not found for: ${deceasedName}` });

      const flowerNameForEmail   = flowerOrder || 'Flower Arrangement';
      const serviceDateForEmail  = serviceDateTime || serviceDate || '';

      // Create DRAFT memory — published only after payment confirmed
      let memoryId = null;
      try {
        // Check for existing unpublished draft first (avoid duplicates)
        const existingQ = query(
          collection(db, 'memories'),
          where('obituaryId', '==', obituaryId),
          where('paymentConfirmed', '==', false),
          where('isFlowerOrder', '==', true)
        );
        const existingSnap = await getDocs(existingQ);

        if (existingSnap.docs.length > 0) {
          memoryId = existingSnap.docs[0].id;
          await updateDoc(doc(db, 'memories', memoryId), {
            flowerName: flowerNameForEmail,
            serviceDate: serviceDateForEmail,
            serviceLocation,
            customerEmail: customerEmail || existingSnap.docs[0].data().customerEmail || '',
            updatedAt: new Date(),
          });
          console.log('📝 Updated existing draft memory:', memoryId);
        } else {
          const docRef = await addDoc(collection(db, 'memories'), {
            obituaryId,
            name: customerName || 'Flower Order',
            relationship: 'Flower Order',
            memoryText: `Sent ${flowerNameForEmail} as a tribute to ${deceasedName}`,
            createdAt: new Date(),
            published: false,
            isFlowerOrder: true,
            flowerName: flowerNameForEmail,
            flowerImage: null,
            orderTotal: '',
            deceasedName,
            serviceDate: serviceDateForEmail,
            serviceLocation,
            obituaryUrl,
            paymentConfirmed: false,
            customerEmail,
          });
          memoryId = docRef.id;
          console.log('💐 Draft memory created:', memoryId);
        }
      } catch (err) { console.error('Failed to create/update draft memory:', err); }

      return res.status(200).json({
        success: true,
        obituaryId,
        memoryId,
        deceased: deceasedName,
        message: `Order stored for ${deceasedName}. Awaiting payment.`,
      });
    }

    // =========================================================
    // PATH 2: GHL PAYMENT WEBHOOK — look up Firebase, send emails, publish
    // We do NOT rely on GHL passing the deceased name.
    // Everything we need is already in Firebase from the button click.
    // =========================================================
    console.log('💳 GHL Payment confirmed — looking up pending order from Firebase');

    // GHL sends camelCase (firstName/lastName) — handle both formats + custom data field
    const customerName =
      orderData.customerName                                           // custom data field {{contact.name}}
      || orderData.contact?.name                                       // full name field
      || (orderData.contact?.firstName && orderData.contact?.lastName
          ? `${orderData.contact.firstName} ${orderData.contact.lastName}` : null)
      || (orderData.contact?.first_name && orderData.contact?.last_name
          ? `${orderData.contact.first_name} ${orderData.contact.last_name}` : null)
      || 'A caring friend';
    const customerEmail = orderData.customerEmail || orderData.contact?.email || '';
    const orderTotal    = orderData.orderTotal || orderData.total || '';
    const productName   = orderData.productName || orderData.product_name || '';

    console.log('👤 Customer:', customerName, '|', customerEmail);
    console.log('🌸 Product from GHL:', productName || '(not sent)');

    // ── Find the pending draft in Firebase ──────────────────────────────────
    // Use a single where() to avoid composite index requirements.
    // Filter isFlowerOrder + matching in JavaScript.
    let pendingOrder = null;
    try {
      const allQ = query(
        collection(db, 'memories'),
        where('paymentConfirmed', '==', false)
      );
      const allSnap = await getDocs(allQ);
      const pending = allSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.isFlowerOrder === true);

      console.log('🔍 Pending flower orders found:', pending.length);
      pending.forEach(p => console.log('  -', p.deceasedName, '| email:', p.customerEmail, '| flower:', p.flowerName));

      // 1. Match by customer email (most reliable — entered at confirm time)
      if (customerEmail) {
        pendingOrder = pending.find(d => d.customerEmail === customerEmail) || null;
        if (pendingOrder) console.log('✅ Matched by customer email:', pendingOrder.deceasedName);
      }

      // 2. Match by product/flower name
      if (!pendingOrder && productName) {
        pendingOrder = pending.find(d => d.flowerName === productName) || null;
        if (pendingOrder) console.log('✅ Matched by product name:', pendingOrder.deceasedName);
      }

      // 3. Most recent as last resort
      if (!pendingOrder && pending.length > 0) {
        pendingOrder = pending.sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(0);
          const tb = b.createdAt?.toDate?.() || new Date(0);
          return tb - ta;
        })[0];
        console.log('✅ Matched by most recent:', pendingOrder.deceasedName);
      }
    } catch (err) { console.error('❌ Error querying Firebase:', err); }

    if (!pendingOrder) {
      console.error('❌ No pending flower order found in Firebase');
      return res.status(400).json({ error: 'No pending flower order found' });
    }

    const deceasedName    = pendingOrder.deceasedName    || '';
    const flowerName      = pendingOrder.flowerName      || 'Flower Arrangement';
    const serviceDate     = pendingOrder.serviceDate     || '';
    const serviceLocation = pendingOrder.serviceLocation || '';
    const obituaryId      = pendingOrder.obituaryId      || null;

    console.log('🎯 Order found:', deceasedName, '|', flowerName);

    // ── Get floral shop ─────────────────────────────────────────────────────
    let floralShop = null;
    if (obituaryId) {
      try {
        const obituarySnap = await getDoc(doc(db, 'obituaries', obituaryId));
        if (obituarySnap.exists()) {
          const obituaryData = obituarySnap.data();
          if (obituaryData.selectedFloralShopId) {
            const shopSnap = await getDoc(doc(db, 'floralShops', obituaryData.selectedFloralShopId));
            if (shopSnap.exists()) {
              floralShop = { id: shopSnap.id, ...shopSnap.data() };
              console.log('✅ Floral shop:', floralShop.name);
            }
          }
        }
      } catch (err) { console.error('Error fetching floral shop:', err); }
    }

    const DIRECTOR_EMAIL = 'marketingreboost@gmail.com';

    // ── Send director email ─────────────────────────────────────────────────
    try {
      await sendDirectorFlowerOrderNotification({
        directorEmail: DIRECTOR_EMAIL,
        deceasedName,
        customerName,
        flowerName,
        serviceDate,
        serviceTime: '',
        serviceLocation,
        pendingPayment: false,
      });
      console.log('✉️ Director email sent to:', DIRECTOR_EMAIL);
    } catch (err) {
      console.error('❌ Director email FAILED. Error details:', JSON.stringify(err?.message || err));
    }

    // ── Send floral shop email ──────────────────────────────────────────────
    if (floralShop?.email) {
      try {
        await sendFloralShopOrderEmail({
          floralShopEmail: floralShop.email,
          floralShopName: floralShop.name,
          deceasedName,
          customerName,
          customerEmail,
          customerPhone: orderData.contact?.phone || '',
          flowerName,
          flowerImage: null,
          serviceDate,
          serviceTime: '',
          serviceLocation,
          deliveryAddress: '',
          orderNotes: flowerName,
          orderTotal,
          pendingPayment: false,
        });
        console.log('✉️ Floral shop email sent to:', floralShop.email);
      } catch (err) {
        console.error('❌ Floral shop email FAILED. Error details:', JSON.stringify(err?.message || err));
      }
    } else {
      console.warn('⚠️ No floral shop email — floralShop:', floralShop ? floralShop.name : 'NOT FOUND');
    }

    // ── Publish the memory ──────────────────────────────────────────────────
    try {
      await updateDoc(doc(db, 'memories', pendingOrder.id), {
        published: true,
        paymentConfirmed: true,
        orderTotal,
        name: customerName,
        customerEmail,
      });
      console.log('✅ Memory published:', pendingOrder.id);
    } catch (err) {
      console.error('❌ Memory publish FAILED:', JSON.stringify(err?.message || err));
    }

    return res.status(200).json({
      success: true,
      deceased: deceasedName,
      customer: customerName,
      flower: flowerName,
      emailsSent: true,
      memoryPublished: true,
      message: `✅ Payment confirmed. Emails sent. Memory wall updated for ${deceasedName}.`,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Failed to process order', message: error.message });
  }
}
