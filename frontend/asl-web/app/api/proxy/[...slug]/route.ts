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

  // Detect if it's a form-data (like for /predict)
  const contentType = req.headers.get("content-type") || "";
  let res;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

  } else {
    const body = await req.json();

    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  // Handle JSON or text responses
  const responseContentType = res.headers.get("content-type");

  if (responseContentType?.includes("application/json")) {
    const data = await res.json();
    return NextResponse.json(data);
  } else {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }
}


// Add delete if needed
