import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Session tokens set by Better Auth
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');

  const isLoginPage = pathname === '/login';

  // If user is not authenticated and trying to access protected page
  if (!sessionCookie && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated and visits /login, redirect to /
  if (sessionCookie && isLoginPage) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
