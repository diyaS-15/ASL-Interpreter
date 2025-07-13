import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const url = `${BACKEND_BASE_URL}/${params.slug.join('/')}${req.nextUrl.search}`;
  const response = await fetch(url);
  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const url = `${BACKEND_BASE_URL}/${params.slug.join('/')}`;
  const body = await req.json();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return NextResponse.json(data);
}

// Add delete if needed
