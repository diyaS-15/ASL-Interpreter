// app/api/proxy/predict/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function POST(req: NextRequest) {
    console.log("HIT /api/proxy/predict");
  const url = `${BACKEND_BASE_URL}/predict`;
  const formData = await req.formData();

  // Debugging
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      console.log(`FormData field: ${key} = ${value}`);
    } else {
      console.log(`FormData file: ${key}, name: ${value.name}, size: ${value.size}`);
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    body: formData, // Important: leave out Content-Type header
  });

  const contentType = res.headers.get("content-type");

  console.log(`res exists: ${res} content-type: ${contentType}`);

  if (contentType?.includes("application/json")) {
    const json = await res.json();
    console.log(`json: ${json}`);
    return NextResponse.json(json);
  } else {
    const text = await res.text();
    console.log(`text: ${text}`);
    return new NextResponse(text, { status: res.status });
  }
}
