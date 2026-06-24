import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Inject the current pathname as a header so server component layouts
// can read it via headers() — used to prevent redirect loops in the
// mustChangePassword check in the app layout.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
