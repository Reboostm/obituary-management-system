import axios from 'axios';
import { Lead } from '@/types/lead';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';

export async function pushLeadToGHL(lead: Lead): Promise<boolean> {
  if (!GHL_API_KEY) {
    console.error('No GHL API key');
    return false;
  }

  try {
    const [firstName, ...lastParts] = lead.contact.name.split(' ');
    const contact = {
      firstName: firstName || lead.businessName,
      lastName: lastParts.join(' ') || lead.businessName,
      email: lead.email,
      phone: lead.phone,
      address1: lead.location.address,
      city: lead.location.city,
      state: lead.location.state,
      postalCode: lead.location.zip,
      customFields: {
        niche: lead.niche,
        qualityScore: lead.qualityScore.toString(),
        businessName: lead.businessName,
      },
      source: 'LeadGen Platform',
    };

    const response = await axios.post(`${GHL_BASE_URL}/v1/contacts/`, contact, {
      headers: { 'Authorization': `Bearer ${GHL_API_KEY}` },
      timeout: 10000,
    });

    return response.data.success === true;
  } catch (error: any) {
    console.error(`GHL push failed:`, error.response?.data?.error || error.message);
    return false;
  }
}

export async function pushLeadsToGHLBatch(leads: Lead[]) {
  let succeeded = 0, failed = 0;
  for (const lead of leads) {
    if (await pushLeadToGHL(lead)) {
      succeeded += 1;
    } else {
      failed += 1;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return { succeeded, failed };
}
