import { NextResponse, type NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/contact'];
const publicApiPrefixes = ['/api/auth', '/api/debug'];
const adminPrefix = '/admin';

function isPublicPath(pathname: string) {
  return publicPaths.includes(pathname) || publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const role = request.cookies.get('satguru_role')?.value;
  const hasSession = Boolean(request.cookies.get('satguru_session')?.value);
  const hasPortalEntry = searchParams.get('entry') === 'portal';

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSession && !hasPortalEntry) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith(adminPrefix) && !['admin', 'super_admin'].includes(role ?? '')) {
    return NextResponse.redirect(new URL('/dashboard?entry=portal', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
