import { NextRequest, NextResponse } from 'next/server';
import { fetchSettlement } from '@/lib/coupang-api';
import { getCredentialsFromRequest } from '@/lib/auth';
import { MOCK_SETTLEMENT } from '@/lib/mockData';

export async function GET(req: NextRequest) {
  const testMode = req.cookies.get('test_mode')?.value === 'true';
  if (testMode) return NextResponse.json(MOCK_SETTLEMENT);

  const creds = getCredentialsFromRequest(req);
  if (!creds) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  if (!month) {
    return NextResponse.json({ error: '정산 월이 필요합니다.' }, { status: 400 });
  }

  try {
    const data = await fetchSettlement(creds.accessKey, creds.secretKey, creds.vendorId, month);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}