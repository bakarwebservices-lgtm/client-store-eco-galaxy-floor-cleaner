import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, verifyCustomerToken, ADMIN_COOKIE_NAME, CUSTOMER_COOKIE_NAME } from '@/lib/auth/token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
      if (token && (await verifyAdminToken(token))) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      return NextResponse.next();
    }

    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const verified = await verifyAdminToken(token);
    if (!verified) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 2. Protect Customer Account Routes
  if (pathname.startsWith('/account')) {
    if (pathname === '/account/login' || pathname === '/account/register') {
      const token = req.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
      if (token && (await verifyCustomerToken(token))) {
        return NextResponse.redirect(new URL('/account', req.url));
      }
      return NextResponse.next();
    }

    const token = req.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL('/account/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const verified = await verifyCustomerToken(token);
    if (!verified) {
      const loginUrl = new URL('/account/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
};
