import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__session";
const ACCESS_VALUE = "autorizado";
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE ?? "false";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  if (MAINTENANCE_MODE !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const allowedRoutes = ["/construccion", "/api/acceso"];
  const isAllowedRoute = allowedRoutes.some((route) => pathname.startsWith(route));

  const isInternalFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/imagenes") ||
    pathname.startsWith("/images") ||
    pathname.includes(".");

  if (isAllowedRoute || isInternalFile) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (cookie === ACCESS_VALUE) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/construccion";

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
