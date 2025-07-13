import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // ✅ Force Node.js runtime (NOT edge)

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function GET(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}${req.nextUrl.search}`;
  console.log('Proxying GET to:', url);
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}`;
  console.log('Proxying POST to:', url);

  const contentType = req.headers.get("content-type") || "";
  let backendResponse;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    backendResponse = await fetch(url, {
      method: 'POST',
      body: formData,
    });
  } else {
    const body = await req.json();

    backendResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const responseContentType = backendResponse.headers.get("content-type");

  if (responseContentType?.includes("application/json")) {
    const data = await backendResponse.json();
    return NextResponse.json(data);
  } else {
    const text = await backendResponse.text();
    return new NextResponse(text, { status: backendResponse.status });
  }
}

// Add delete if needed
