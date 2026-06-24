import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const CEO_ONLY_PATHS = ["/approvals", "/budget", "/settings", "/alerts"];
const AUTH_PATHS = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  const isLoggedIn = !!session?.user;
  const isAuthPage = AUTH_PATHS.some((p) => path.startsWith(p));
  const isCeoOnly = CEO_ONLY_PATHS.some((p) => path.startsWith(p));

  if (!isLoggedIn && !isAuthPage && !path.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // /settings/password is accessible by all roles (forced password change)
  if (isLoggedIn && isCeoOnly && session?.user?.role !== "CEO" && !path.startsWith("/settings/password")) {
    return NextResponse.redirect(new URL("/departments", nextUrl));
  }

  // Inject current pathname as a header so server component layouts can read it
  // via headers() — used to prevent mustChangePassword redirect loops.
  const response = NextResponse.next();
  response.headers.set("x-pathname", path);
  return response;
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)"],
};
