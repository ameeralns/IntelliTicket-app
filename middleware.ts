import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/reset-password'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const isPublicRoute = PUBLIC_ROUTES.includes(req.nextUrl.pathname);
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard');

  // Handle public routes
  if (isPublicRoute) {
    if (session) {
      // Redirect logged in users to their dashboard
      const userRole = session.user.user_metadata.role;
      return NextResponse.redirect(new URL(`/dashboard/${userRole}`, req.url));
    }
    return res;
  }

  // Handle auth routes
  if (isAuthRoute) {
    if (session) {
      // Redirect logged in users to their dashboard
      const userRole = session.user.user_metadata.role;
      return NextResponse.redirect(new URL(`/dashboard/${userRole}`, req.url));
    }
    return res;
  }

  // Handle dashboard routes
  if (isDashboardRoute) {
    if (!session) {
      // Redirect unauthenticated users to login
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = session.user.user_metadata.role;
    const requestedRole = req.nextUrl.pathname.split('/')[2]; // /dashboard/[role]

    if (userRole !== requestedRole) {
      // Redirect users trying to access wrong dashboard
      return NextResponse.redirect(new URL(`/dashboard/${userRole}`, req.url));
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 