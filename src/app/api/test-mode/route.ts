import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { enable } = await req.json();
  const res = NextResponse.json({ ok: true, testMode: enable });
  res.cookies.set('test_mode', enable ? 'true' : 'false', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return res;
}