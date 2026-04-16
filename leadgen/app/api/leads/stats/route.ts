import { NextRequest, NextResponse } from 'next/server';
import { getLeadStats } from '@/lib/firestore-service';

export async function GET(request: NextRequest) {
  try {
    const county = request.nextUrl.searchParams.get('county');
    if (!county) return NextResponse.json({ success: false, error: 'county required' }, { status: 400 });
    
    const stats = await getLeadStats(county);
    return NextResponse.json({ success: true, data: stats || { total: 0 } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
