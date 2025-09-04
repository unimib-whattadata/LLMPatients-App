/**
 * NextAuth.js Middleware for Protected Routes
 * 
 * This middleware protects dashboard routes and ensures users are authenticated
 * before accessing protected areas of the application.
 */

export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard/:path*"]
}