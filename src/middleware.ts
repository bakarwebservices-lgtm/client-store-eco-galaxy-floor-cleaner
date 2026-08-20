import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth/token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';
    const isAuthApi = pathname.startsWith('/api/auth/admin/login');

    if (isAuthApi) {
      return NextResponse.next();
    }

    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const session = token ? await verifyAdminToken(token) : null;

    // If user is already authenticated and tries to access /admin/login, redirect to /admin
    if (isLoginPage && session) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    // If user is unauthenticated and tries to access protected /admin routes, redirect to /admin/login
    if (!isLoginPage && !session) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
