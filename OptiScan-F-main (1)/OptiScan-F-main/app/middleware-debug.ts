// app/middleware-debug.ts (o en la raíz)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('🌐 Request:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers),
    auth: request.headers.get('authorization')
  });
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
};