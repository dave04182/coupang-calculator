import crypto from 'crypto';

// ─── 쿠팡 Open API HMAC 인증 ─────────────────────────────────
// 공식 문서: https://developers.coupangcorp.com/hc/ko

interface CoupangRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string>;
  body?: object;
  accessKey: string;
  secretKey: string;
}

function generateHmacSignature(
  method: string,
  path: string,
  query: string,
  secretKey: string
): { authorization: string; datetime: string } {
  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z/, '')
    .slice(0, 15) + 'Z';

  const message = datetime + method + path + (query ? query : '');
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');

  return { authorization: hmac, datetime };
}

export async function coupangRequest<T = unknown>({
  method,
  path,
  query = {},
  body,
  accessKey,
  secretKey,
}: CoupangRequestOptions): Promise<T> {
  const BASE_URL = 'https://api-gateway.coupang.com';

  const queryString = Object.keys(query).length
    ? '?' + new URLSearchParams(query).toString()
    : '';

  const { authorization, datetime } = generateHmacSignature(
    method,
    path,
    new URLSearchParams(query).toString(),
    secretKey
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
    Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${authorization}`,
  };

  const res = await fetch(`${BASE_URL}${path}${queryString}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`쿠팡 API 오류 [${res.status}]: ${error}`);
  }

  return res.json() as Promise<T>;
}

// ─── 주문 목록 조회 ──────────────────────────────────────────
export async function fetchOrders(
  accessKey: string,
  secretKey: string,
  vendorId: string,
  createdAtFrom: string,
  createdAtTo: string
) {
  return coupangRequest({
    method: 'GET',
    path: `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`,
    query: {
      createdAtFrom,
      createdAtTo,
      status: 'ACCEPT',
    },
    accessKey,
    secretKey,
  });
}

// ─── 반품/취소 목록 조회 ─────────────────────────────────────
export async function fetchReturns(
  accessKey: string,
  secretKey: string,
  vendorId: string,
  createdAtFrom: string,
  createdAtTo: string
) {
  return coupangRequest({
    method: 'GET',
    path: `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/returnRequests`,
    query: {
      createdAtFrom,
      createdAtTo,
    },
    accessKey,
    secretKey,
  });
}

// ─── 판매 상품 목록 조회 ─────────────────────────────────────
export async function fetchProducts(
  accessKey: string,
  secretKey: string,
  vendorId: string,
  nextToken?: string,
  maxPerPage = 50
) {
  const query: Record<string, string> = { maxPerPage: String(maxPerPage) };
  if (nextToken) query.nextToken = nextToken;

  return coupangRequest({
    method: 'GET',
    path: `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/products`,
    query,
    accessKey,
    secretKey,
  });
}

// ─── 정산 내역 조회 ───────────────────────────────────────────
export async function fetchSettlement(
  accessKey: string,
  secretKey: string,
  vendorId: string,
  month: string  // YYYY-MM
) {
  // month를 날짜 범위로 변환
  const from = `${month}-01`;
  const lastDay = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;

  return coupangRequest({
    method: 'GET',
    path: `/v2/providers/openapi/apis/api/v1/revenue-history`,
    query: {
      vendorId,
      recognitionDateFrom: from,
      recognitionDateTo: to,
    },
    accessKey,
    secretKey,
  });
}
