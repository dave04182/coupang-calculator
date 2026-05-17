import { NextRequest, NextResponse } from 'next/server';

// POST: API 키 저장 (httpOnly 쿠키)
export async function POST(req: NextRequest) {
  const { accessKey, secretKey, vendorId } = await req.json();

  if (!accessKey || !secretKey || !vendorId) {
    return NextResponse.json({ error: '모든 필드를 입력하세요.' }, { status: 400 });
  }



  const savedAt = new Date().toISOString();
  const res = NextResponse.json({ ok: true, savedAt });

  // httpOnly 쿠키로 저장 — JS에서 접근 불가, 서버에서만 읽힘
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 180, // 180일 (쿠팡 API 키 유효기간과 동일)
    path: '/',
  };

  res.cookies.set('coupang_access_key', accessKey, cookieOptions);
  res.cookies.set('coupang_secret_key', secretKey, cookieOptions);
  res.cookies.set('coupang_vendor_id', vendorId, cookieOptions);

  return res;
}

// DELETE: 로그아웃 (쿠키 삭제)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('coupang_access_key');
  res.cookies.delete('coupang_secret_key');
  res.cookies.delete('coupang_vendor_id');
  return res;
}

// GET: 연동 상태 확인 (키 값은 노출하지 않음)
export async function GET(req: NextRequest) {
  const vendorId = req.cookies.get('coupang_vendor_id')?.value;
  const testMode = req.cookies.get('test_mode')?.value === 'true';
  const hasKey = !!(
    req.cookies.get('coupang_access_key')?.value &&
    req.cookies.get('coupang_secret_key')?.value &&
    vendorId
  );
  return NextResponse.json({ configured: hasKey || testMode, vendorId: vendorId ?? null, testMode });
}
