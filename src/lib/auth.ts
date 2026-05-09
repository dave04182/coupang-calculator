import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// API Route 핸들러 내에서 쿠키로부터 인증 정보 읽기
export function getCredentialsFromRequest(req: NextRequest) {
  const accessKey = req.cookies.get('coupang_access_key')?.value;
  const secretKey = req.cookies.get('coupang_secret_key')?.value;
  const vendorId = req.cookies.get('coupang_vendor_id')?.value;

  if (!accessKey || !secretKey || !vendorId) {
    return null;
  }
  return { accessKey, secretKey, vendorId };
}

// Server Component에서 사용
export async function getCredentialsFromCookies() {
  const cookieStore = await cookies();
  const accessKey = cookieStore.get('coupang_access_key')?.value;
  const secretKey = cookieStore.get('coupang_secret_key')?.value;
  const vendorId = cookieStore.get('coupang_vendor_id')?.value;

  if (!accessKey || !secretKey || !vendorId) {
    return null;
  }
  return { accessKey, secretKey, vendorId };
}
