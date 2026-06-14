import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Route protection. Fine-grained RBAC happens server-side in every page and
 * action (lib/auth/session.ts); this middleware provides the outer wall.
 */
export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/logg-inn", req.url));
    }
    if (
      path.startsWith("/bedrift/app") &&
      role !== "BUSINESS_OWNER" &&
      role !== "BUSINESS_MEMBER"
    ) {
      return NextResponse.redirect(new URL("/logg-inn", req.url));
    }
    if (path.startsWith("/app") && role !== "CONSUMER") {
      return NextResponse.redirect(new URL("/logg-inn", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: "/logg-inn" },
  },
);

export const config = {
  matcher: ["/app/:path*", "/bedrift/app/:path*", "/admin/:path*"],
};
