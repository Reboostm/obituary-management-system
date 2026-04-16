import { NextRequest, NextResponse } from 'next/server';
import { addLeadsBatch } from '@/lib/firestore-service';
import { Lead } from '@/types/lead';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leads } = body as { leads: Partial<Lead>[] };

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ success: false, error: 'leads array required' }, { status: 400 });
    }

    const validLeads: Lead[] = leads
      .filter((l) => l.businessName && l.niche && l.location?.county)
      .map((l) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        businessName: l.businessName!,
        niche: l.niche!,
        location: {
          county: l.location!.county,
          city: l.location!.city || '',
          state: 'UT',
          zip: l.location!.zip || '',
          address: l.location!.address || '',
        },
        contact: l.contact || { name: l.businessName! },
        phone: l.phone,
        email: l.email,
        website: l.website,
        businessType: l.businessType || 'mixed',
        emailVerified: l.emailVerified || false,
        phoneVerified: l.phoneVerified || false,
        locationVerified: l.locationVerified || false,
        qualityScore: l.qualityScore || 60,
        createdAt: new Date(),
        updatedAt: new Date(),
        scraped_source: 'manual_import',
      }));

    const ids = await addLeadsBatch(validLeads);
    return NextResponse.json({ success: true, data: { imported: ids.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
