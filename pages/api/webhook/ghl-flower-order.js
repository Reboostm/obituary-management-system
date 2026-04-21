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

    // Extract key data from GHL order
    // GHL webhook typically includes: contact info, order details, custom fields
    const deceasedName = orderData.deceasedName || orderData.contact?.first_name || '';
    const customerName = orderData.contact?.first_name && orderData.contact?.last_name
      ? `${orderData.contact.first_name} ${orderData.contact.last_name}`
      : orderData.customerName || 'Unknown';
    const customerEmail = orderData.contact?.email || orderData.customerEmail || '';
    const customerPhone = orderData.contact?.phone || orderData.customerPhone || '';
    const flowerName = orderData.productName || orderData.flowerName || 'Flower Arrangement';
    const flowerImage = orderData.productImage || orderData.flowerImage || null;
    const deliveryAddress = orderData.deliveryAddress || '';
    const orderNotes = orderData.specialInstructions || orderData.notes || '';
    const orderTotal = orderData.orderTotal || orderData.total || '';

    if (!deceasedName) {
      return res.status(400).json({ error: 'Deceased name required' });
    }

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

    // Get service info from obituary
    const primaryService = obituary.services?.find(s => s.type === 'Funeral Service') || obituary.services?.[0] || {};
    const serviceDate = primaryService.date || '';
    const serviceTime = primaryService.time || '';
    const serviceLocation = primaryService.location || '';

    // Get director email (hardcoded for now, can be made configurable)
    const DIRECTOR_EMAIL = 'marketingreboost@gmail.com';

    // Send email to director
    try {
      await sendDirectorFlowerOrderNotification({
        directorEmail: DIRECTOR_EMAIL,
        deceasedName,
        customerName,
        flowerName,
        serviceDate,
        serviceTime,
        serviceLocation,
      });
      console.log('Director email sent');
    } catch (err) {
      console.error('Failed to send director email:', err);
      // Don't fail the webhook if director email fails
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
          flowerName,
          flowerImage,
          serviceDate,
          serviceTime,
          serviceLocation,
          deliveryAddress,
          orderNotes,
          orderTotal,
        });
        console.log('Floral shop email sent');
      } catch (err) {
        console.error('Failed to send floral shop email:', err);
        // Don't fail the webhook if floral shop email fails
      }
    }

    // Create memory entry for flower order
    try {
      const memoryEntry = {
        obituaryId,
        name: customerName,
        relationship: 'Flower Order',
        memoryText: `Sent ${flowerName} as a tribute to ${deceasedName}`,
        createdAt: new Date(),
        published: true,
        isFlowerOrder: true, // Flag to identify as flower order
        flowerName,
        flowerImage,
        orderTotal,
      };

      const memoryRef = collection(db, 'memories');
      await addDoc(memoryRef, memoryEntry);
      console.log('Memory entry created');
    } catch (err) {
      console.error('Failed to create memory entry:', err);
      // Don't fail the webhook if memory creation fails
    }

    // Return success
    return res.status(200).json({
      success: true,
      obituaryId,
      floralShopNotified: !!floralShop,
      message: 'Flower order processed successfully',
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process order',
      message: error.message,
    });
  }
}
