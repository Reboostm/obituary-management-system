import { NextRequest, NextResponse } from 'next/server';
import { pushLeadsToGHLBatch } from '@/lib/ghl-service';

export async function POST(request: NextRequest) {
  try {
    const { leads } = await request.json();
    if (!Array.isArray(leads)) throw new Error('leads required');
    const result = await pushLeadsToGHLBatch(leads);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
