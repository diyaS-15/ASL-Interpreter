import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function GET(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}${req.nextUrl.search}`;
  console.log('Proxying to:', url);
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}`;
  console.log('Proxying to:', url);
  const body = await req.json();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  return NextResponse.json(data);
}

// Add delete if needed
