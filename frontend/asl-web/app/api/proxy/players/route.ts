import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}${req.nextUrl.search}`;
  console.log('Proxying GET to:', url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Backend error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Players proxy GET error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}`;
  console.log('Proxying POST to:', url);
  try {
    const body = await req.text();
    const backendResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    });
    const responseContentType = backendResponse.headers.get('content-type');
    if (responseContentType?.includes('application/json')) {
      const data = await backendResponse.json();
      return NextResponse.json(data, { status: backendResponse.status });
    }
    const text = await backendResponse.text();
    return new NextResponse(text, { status: backendResponse.status });
  } catch (err) {
    console.error('Players proxy POST error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
