/**
 * GHL Contact Update API
 * Called when customer clicks "Confirm Order" on flower page
 * 1. Searches GHL for contact by email
 * 2. Updates custom fields with deceased name, service info, flower details
 * 3. Also creates a draft memory entry in Firebase
 */

import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';

const GHL_API_KEY = 'pit-0a04d0a8-b634-4b2c-8f96-9e8ebcaad2dc';
const GHL_LOCATION_ID = '8Z8DYXwo6cwCrx91szgq';
const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      customerEmail,
      deceasedName,
      serviceDate,
      serviceDateTime,
      serviceLocation,
      flowerOrder,
      obituaryUrl,
    } = req.body;

    console.log('📤 GHL UPDATE - Deceased:', deceasedName, '| Customer Email:', customerEmail);

    if (!deceasedName) {
      return res.status(400).json({ error: 'Deceased name required' });
    }

    // ===============================
    // STEP 1: Find contact in GHL by email
    // ===============================
    let contactId = null;
    if (customerEmail) {
      try {
        // Try duplicate search first
        const searchRes = await fetch(
          `${GHL_API_BASE}/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              'Authorization': `Bearer ${GHL_API_KEY}`,
              'Version': '2021-07-28',
            },
          }
        );
        const searchData = await searchRes.json();
        console.log('🔍 GHL search response:', JSON.stringify(searchData));

        // GHL returns contact directly or in a contacts array
        if (searchData?.contact?.id) {
          contactId = searchData.contact.id;
        } else if (searchData?.contacts?.[0]?.id) {
          contactId = searchData.contacts[0].id;
        }

        if (contactId) {
          console.log('✅ Found GHL contact:', contactId);
        } else {
          // Fallback: search by email via contacts search
          const fallbackRes = await fetch(
            `${GHL_API_BASE}/contacts/?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(customerEmail)}&limit=1`,
            {
              headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': '2021-07-28',
              },
            }
          );
          const fallbackData = await fallbackRes.json();
          console.log('🔍 GHL fallback search:', JSON.stringify(fallbackData));
          if (fallbackData?.contacts?.[0]?.id) {
            contactId = fallbackData.contacts[0].id;
            console.log('✅ Found GHL contact (fallback):', contactId);
          }
        }
      } catch (err) {
        console.error('Error searching GHL contact:', err);
      }
    }

    // ===============================
    // STEP 2: Update GHL contact custom fields
    // Note: GHL API uses "value" not "field_value"
    // ===============================
    if (contactId) {
      try {
        const fieldsPayload = {
          customFields: [
            { key: 'flower__deceased_name', value: deceasedName },
            { key: 'flower__service_date', value: serviceDateTime || serviceDate || '' },
            { key: 'flower__service_location', value: serviceLocation || '' },
            { key: 'flower__order_details', value: flowerOrder || '' },
          ],
        };
        console.log('📤 Sending to GHL:', JSON.stringify(fieldsPayload));

        const updateRes = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fieldsPayload),
        });
        const updateData = await updateRes.json();
        console.log('✅ GHL update response:', JSON.stringify(updateData));

        if (!updateRes.ok) {
          console.error('❌ GHL update failed with status:', updateRes.status);
        }
      } catch (err) {
        console.error('Error updating GHL contact:', err);
      }
    } else {
      console.warn('⚠️ No GHL contact found for email:', customerEmail);
    }

    // ===============================
    // STEP 3: Create draft memory in Firebase
    // (will be published when payment confirmed)
    // ===============================
    let obituaryId = null;
    try {
      const q = query(collection(db, 'obituaries'), where('fullName', '==', deceasedName));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        obituaryId = snapshot.docs[0].id;
      }
    } catch (err) {
      console.error('Error finding obituary:', err);
    }

    // ===============================
    // STEP 3: Create OR update draft memory in Firebase
    // Check first — avoid duplicates when this is called a second time with email
    // ===============================
    let memoryId = null;
    if (obituaryId) {
      try {
        // Check for existing unpublished draft for this obituary
        const existingQ = query(
          collection(db, 'memories'),
          where('obituaryId', '==', obituaryId),
          where('paymentConfirmed', '==', false),
          where('isFlowerOrder', '==', true)
        );
        const existingSnap = await getDocs(existingQ);

        if (existingSnap.docs.length > 0) {
          // Draft already exists — just update the email if we now have it
          memoryId = existingSnap.docs[0].id;
          if (customerEmail) {
            await updateDoc(doc(db, 'memories', memoryId), { customerEmail });
          }
          console.log('📝 Existing draft memory updated:', memoryId);
        } else {
          // No draft yet — create one
          const memoryEntry = {
            obituaryId,
            name: 'Flower Order',
            relationship: 'Flower Order',
            memoryText: `Sent ${flowerOrder || 'flowers'} as a tribute to ${deceasedName}`,
            createdAt: new Date(),
            published: false,
            isFlowerOrder: true,
            flowerName: flowerOrder || 'Flower Arrangement',
            flowerImage: null,
            orderTotal: '',
            deceasedName,
            paymentConfirmed: false,
            customerEmail: customerEmail || '',
          };
          const docRef = await addDoc(collection(db, 'memories'), memoryEntry);
          memoryId = docRef.id;
          console.log('💐 Draft memory created:', memoryId);
        }
      } catch (err) {
        console.error('Error creating/updating draft memory:', err);
      }
    }

    return res.status(200).json({
      success: true,
      contactId,
      memoryId,
      obituaryId,
      message: `Contact updated in GHL. Draft memory created. Awaiting payment confirmation.`,
    });

  } catch (error) {
    console.error('❌ GHL update error:', error);
    return res.status(500).json({ error: 'Failed to update contact', message: error.message });
  }
}
