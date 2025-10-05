
import { auth } from "~/server/auth";
import { NextResponse } from "next/server";


export default auth((req) => {
  const session = req.auth;
  const isAuthenticated = !!(session?.user?.id && session?.user?.email);
  const pathname = req.nextUrl.pathname;
  const searchParams = req.nextUrl.searchParams;
  const specialKey = searchParams.get("specialKey");

  
  const impersonationContext = session?.impersonation;
  const isImpersonating = impersonationContext?.isImpersonating;
  const originalAdminId = impersonationContext?.originalAdminId;
  const targetUserId = impersonationContext?.targetUserId;

  
  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicAuthRoute = isAuthRoute;
  const isApiAuthRoute = pathname.startsWith("/api/auth");
  const isStaticRoute =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");
  const isPublicPatientRoute = pathname.startsWith("/explore-patients");
  const isPublicHomeRoute = pathname === "/";

  
  if (isApiAuthRoute || isStaticRoute) {
    return NextResponse.next();
  }

  
  if (isPublicPatientRoute || isPublicHomeRoute || isPublicAuthRoute) {
    console.log("Middleware - Allowing public access to page:", pathname);
    return NextResponse.next();
  }

  
  if (process.env.NODE_ENV === "development") {
    console.log("Middleware - Enhanced Check with Impersonation:", {
      pathname,
      isAuthenticated,
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      hasUserEmail: !!session?.user?.email,
      userEmail: session?.user?.email || "none",
      userRole: session?.user?.role || "none",
      isProtectedRoute,
      isAdminRoute,
      isAuthRoute,
      isPublicPatientRoute,
      isPublicHomeRoute,
      isPublicAuthRoute,
      specialKey: specialKey || "none",
      
      isImpersonating: isImpersonating || false,
      originalAdminId: originalAdminId || "none",
      targetUserId: targetUserId || "none",
      impersonationSessionId: impersonationContext?.sessionId || "none",
    });
  }

  
  if (isAdminRoute) {
    
    if (
      process.env.NODE_ENV === "development" &&
      specialKey === "DavideIsTesting"
    ) {
      console.log(
        "Middleware - Allowing admin route access via development bypass",
      );
      return NextResponse.next();
    }

    
    if (!isAuthenticated) {
      console.log(
        "Middleware - Redirecting unauthenticated user from admin route to login",
      );
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    
    const userRole = session?.user?.role;
    
    const actualAdminRole = isImpersonating ? "admin" : userRole; 

    
    if (isImpersonating) {
      
      
      console.log(
        "Middleware - Impersonated user attempting admin route access, redirecting to user dashboard",
      );
      const userDashboardUrl = new URL("/dashboard/user", req.url);
      return NextResponse.redirect(userDashboardUrl);
    }

    if (actualAdminRole !== "admin") {
      console.log(
        "Middleware - Redirecting non-admin user from admin route to dashboard",
      );
      const dashboardUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    console.log("Middleware - Allowing admin route access for admin user");
    return NextResponse.next();
  }

  
  if (isAuthenticated && isAuthRoute) {
    console.log(
      "Middleware - Redirecting authenticated user from auth route to therapeutic journey",
    );
    const dashboardUrl = new URL("/dashboard/therapeutic-journey", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  
  if (!isAuthenticated && isProtectedRoute) {
    console.log("Middleware - Redirecting unauthenticated user to login");
    const loginUrl = new URL("/login", req.url);

    
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  
  if (isAuthenticated && isProtectedRoute) {
    
    if (!session?.user?.id || !session?.user?.email) {
      console.warn(
        "Middleware - Invalid session detected, redirecting to login",
      );
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "session-invalid");
      return NextResponse.redirect(loginUrl);
    }

    
    if (process.env.NODE_ENV === "development") {
      console.log("Middleware - Allowing access to protected route:", {
        pathname,
        userEmail: session.user.email,
        userRole: session.user?.role,
        isImpersonating: isImpersonating || false,
        originalAdmin: originalAdminId || "none",
        targetUser: targetUserId || "none",
      });
    }
  }

  
  return NextResponse.next();
});

export const config = {
  matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
