import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware: mark public per-tenant pages with x-tenant-is-public header so
 * the tenant layout skips auth for them.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Match per-tenant public pages: /app/{tenant_slug}/{login,pricing,demo,signup}
  const publicMatch = pathname.match(/^\/app\/([^\/]+)\/(login|pricing|demo|signup)\/?$/);
  if (publicMatch) {
    const response = NextResponse.next();
    response.headers.set("x-tenant-is-public", "1");
    response.headers.set("x-tenant-slug-param", publicMatch[1]);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:slug/login",
    "/app/:slug/login/",
    "/app/:slug/pricing",
    "/app/:slug/pricing/",
    "/app/:slug/demo",
    "/app/:slug/demo/",
    "/app/:slug/signup",
    "/app/:slug/signup/",
  ],
};
