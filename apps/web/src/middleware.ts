import { NextRequest, NextResponse } from 'next/server';

/**
 * SEC-03: nonce-based CSP. Next.js reads the `x-nonce` request header and
 * attaches the nonce to its inline Flight/bootstrap scripts, so we no longer
 * need `script-src 'unsafe-inline'` on HTML responses.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "form-action 'self'",
  ].join('; ');

  // The public landing is SSG: Next serves cached HTML whose inline scripts have
  // no request nonce, so 'strict-dynamic' would block every chunk and styled-jsx
  // rule (the page renders unstyled and its controls stop working). Scope the
  // same-origin/unsafe-inline exception to that one prerendered route only;
  // every dynamic route keeps the per-request nonce policy above.
  const scriptSrc = request.nextUrl.pathname === '/'
    ? "script-src 'self' 'unsafe-inline'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const staticCsp = csp.replace(/script-src[^;]*/, scriptSrc);

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', request.nextUrl.pathname === '/' ? staticCsp : csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
