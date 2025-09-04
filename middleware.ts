/**
 * NextAuth.js v5 Middleware for Protected Routes
 * 
 * This middleware protects dashboard routes and ensures users are authenticated
 * before accessing protected areas of the application.
 * 
 * Uses NextAuth v5 beta pattern with the auth function as middleware.
 */

import { auth } from "~/server/auth"
import { NextResponse } from "next/server"

// Use the auth function as middleware directly (NextAuth v5 pattern)
export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register');
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware - Route:', req.nextUrl.pathname);
    console.log('Middleware - Is Authenticated:', isAuthenticated);
    console.log('Middleware - User:', req.auth?.user?.email || 'none');
  }
  
  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    console.log('Middleware - Redirecting authenticated user from auth route to dashboard');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // If user is not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    console.log('Middleware - Redirecting unauthenticated user to login');
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Allow the request to proceed
  return NextResponse.next();
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register'
  ]
}