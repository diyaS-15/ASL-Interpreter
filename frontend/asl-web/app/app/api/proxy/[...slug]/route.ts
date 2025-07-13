import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = 'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com';

export async function GET(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
    const url = `${BACKEND_BASE_URL}/${pathname}${req.nextUrl.search}`;
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  }
  
export async function POST(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/proxy\//, '');
    const url = `${BACKEND_BASE_URL}/${pathname}`;
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
