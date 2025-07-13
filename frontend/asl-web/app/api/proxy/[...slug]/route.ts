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

export async function POST(req: NextRequest, context: { params: { slug: string[] } }) {
  const url = `${BACKEND_BASE_URL}/${context.params.slug.join('/')}`;

  console.log("Proxying file upload to:", url);

  const formData = await req.formData();

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    const json = await response.json();
    return NextResponse.json(json);
  } else {
    const text = await response.text();
    return new NextResponse(text, { status: response.status });
  }
}


// Add delete if needed
