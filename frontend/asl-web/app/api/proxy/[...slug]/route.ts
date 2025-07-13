import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function POST(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}`;
  console.log('Proxying POST to:', url);

  const contentType = req.headers.get('content-type') || '';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
    },
    body: req.body, // forward the raw body (stream)
  });

  const responseContentType = res.headers.get('content-type');

  if (responseContentType?.includes('application/json')) {
    const data = await res.json();
    return NextResponse.json(data);
  } else {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }
}

export async function GET(req: NextRequest) {
  const slugPath = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${BACKEND_BASE_URL}/${slugPath}${req.nextUrl.search}`;
  console.log('Proxying GET to:', url);

  const res = await fetch(url);
  const contentType = res.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    const data = await res.json();
    return NextResponse.json(data);
  } else {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }
}


// Add delete if needed
