import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function POST(req: NextRequest) {
  const url = `${BACKEND_BASE_URL}/predict`;
  console.log("Proxying /predict to:", url);

  const formData = await req.formData();

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    const json = await res.json();
    return NextResponse.json(json);
  } else {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }
}
