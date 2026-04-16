import { NextRequest, NextResponse } from 'next/server';
import { searchLeads } from '@/lib/firestore-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const filter = {
      county: searchParams.get('county'),
      niche: searchParams.get('niche')?.split(',') || [],
      minQualityScore: parseInt(searchParams.get('minScore') || '0'),
    };

    const result = await searchLeads(filter, 25);
    return NextResponse.json({ success: true, data: result.leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
