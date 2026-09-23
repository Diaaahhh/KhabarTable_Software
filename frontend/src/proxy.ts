import { NextRequest, NextResponse } from "next/server";

export function proxy
(request: NextRequest) {
  const token = request.cookies.get("admin_token");

  const pathname = request.nextUrl.pathname;

  const isLoginPage = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  if (!token && pathname !== "/login") {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(
      new URL("/admin/dashboard", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};