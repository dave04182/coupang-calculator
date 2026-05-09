import { NextRequest, NextResponse } from 'next/server';
import { coupangRequest } from '@/lib/coupang-api';
import { getCredentialsFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const creds = getCredentialsFromRequest(req);
  if (!creds) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const nextToken = searchParams.get('nextToken') ?? '';
  const maxPerPage = searchParams.get('maxPerPage') ?? '50';

  try {
    const query: Record<string, string> = { maxPerPage };
    if (nextToken) query.nextToken = nextToken;

    const data = await coupangRequest({
      method: 'GET',
      path: `/v2/providers/openapi/apis/api/v4/vendors/${creds.vendorId}/products`,
      query,
      accessKey: creds.accessKey,
      secretKey: creds.secretKey,
    });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
