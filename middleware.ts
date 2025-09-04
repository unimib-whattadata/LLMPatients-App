/**
 * NextAuth.js v5 Middleware for Protected Routes with Impersonation Support
 * 
 * This middleware protects dashboard routes and ensures users are authenticated
 * before accessing protected areas of the application.
 * 
 * Enhanced with impersonation support:
 * - Handles impersonated sessions
 * - Logs impersonation activities
 * - Ensures proper routing for impersonated users
 * 
 * Uses NextAuth v5 beta pattern with the auth function as middleware.
 * Includes enhanced session validation and redirect handling.
 */

import { auth } from "~/server/auth"
import { NextResponse } from "next/server"

// Use the auth function as middleware directly (NextAuth v5 pattern)
export default auth((req) => {
  const session = req.auth;
  const isAuthenticated = !!(session?.user?.id && session?.user?.email);
  const pathname = req.nextUrl.pathname;
  const searchParams = req.nextUrl.searchParams;
  const specialKey = searchParams.get('specialKey');
  
  // Check for impersonation context
  const impersonationContext = (session as any)?.impersonation;
  const isImpersonating = impersonationContext?.isImpersonating;
  const originalAdminId = impersonationContext?.originalAdminId;
  const targetUserId = impersonationContext?.targetUserId;
  
  // Route classifications
  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isStaticRoute = pathname.startsWith('/_next') || 
                       pathname.startsWith('/favicon') || 
                       pathname.includes('.');
  
  // Skip middleware for API auth routes and static assets
  if (isApiAuthRoute || isStaticRoute) {
    return NextResponse.next();
  }
  
  // Enhanced debug logging in development with impersonation context
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware - Enhanced Check with Impersonation:', {
      pathname,
      isAuthenticated,
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      hasUserEmail: !!session?.user?.email,
      userEmail: session?.user?.email || 'none',
      userRole: (session?.user as any)?.role || 'none',
      isProtectedRoute,
      isAdminRoute,
      isAuthRoute,
      specialKey: specialKey || 'none',
      // Impersonation context
      isImpersonating: isImpersonating || false,
      originalAdminId: originalAdminId || 'none',
      targetUserId: targetUserId || 'none',
      impersonationSessionId: impersonationContext?.sessionId || 'none'
    });
  }
  
  // Special admin route access control
  if (isAdminRoute) {
    // Development bypass with special key
    if (process.env.NODE_ENV === 'development' && specialKey === 'DavideIsTesting') {
      console.log('Middleware - Allowing admin route access via development bypass');
      return NextResponse.next();
    }
    
    // Production admin access control
    if (!isAuthenticated) {
      console.log('Middleware - Redirecting unauthenticated user from admin route to login');
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check admin role (considering impersonation)
    const userRole = (session?.user as any)?.role;
    const effectiveRole = isImpersonating ? 'user' : userRole; // Impersonated users have 'user' role in context
    const actualAdminRole = isImpersonating ? 'admin' : userRole; // Original user role for admin verification
    
    // For admin routes, we need the original user to be admin (not the impersonated user)
    if (isImpersonating) {
      // During impersonation, admin routes should be accessible only if original user is admin
      // But this is handled by the originalAdminId check - if impersonating, they should go to user routes
      console.log('Middleware - Impersonated user attempting admin route access, redirecting to user dashboard');
      const userDashboardUrl = new URL('/dashboard/user', req.url);
      return NextResponse.redirect(userDashboardUrl);
    }
    
    if (actualAdminRole !== 'admin') {
      console.log('Middleware - Redirecting non-admin user from admin route to dashboard');
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
    
    console.log('Middleware - Allowing admin route access for admin user');
    return NextResponse.next();
  }
  
  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    console.log('Middleware - Redirecting authenticated user from auth route to dashboard');
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  // If user is not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    console.log('Middleware - Redirecting unauthenticated user to login');
    const loginUrl = new URL('/login', req.url);
    
    // Preserve the intended destination for post-login redirect
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    
    return NextResponse.redirect(loginUrl);
  }
  
  // Enhanced session validation for protected routes
  if (isAuthenticated && isProtectedRoute) {
    // Additional validation to ensure session integrity
    if (!session?.user?.id || !session?.user?.email) {
      console.warn('Middleware - Invalid session detected, redirecting to login');
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'session-invalid');
      return NextResponse.redirect(loginUrl);
    }
    
    // Log successful protected route access with impersonation context
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware - Allowing access to protected route:', {
        pathname,
        userEmail: session.user.email,
        userRole: (session.user as any)?.role,
        isImpersonating: isImpersonating || false,
        originalAdmin: originalAdminId || 'none',
        targetUser: targetUserId || 'none'
      });
    }
  }
  
  // Allow the request to proceed
  return NextResponse.next();
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ]
}