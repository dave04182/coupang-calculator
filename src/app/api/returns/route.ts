import { NextRequest, NextResponse } from 'next/server';
import { fetchReturns } from '@/lib/coupang-api';
import { getCredentialsFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const creds = getCredentialsFromRequest(req);
  if (!creds) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19);
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 19);

  try {
    const data = await fetchReturns(creds.accessKey, creds.secretKey, creds.vendorId, from, to);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
