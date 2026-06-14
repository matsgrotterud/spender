import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

/** Redirects a freshly logged-in user to the dashboard matching their role. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const origin = request.nextUrl.origin;

  if (!user) {
    return NextResponse.redirect(new URL("/logg-inn", origin));
  }
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/admin", origin));
  }
  if (user.role === "BUSINESS_OWNER" || user.role === "BUSINESS_MEMBER") {
    return NextResponse.redirect(new URL("/bedrift/app", origin));
  }
  return NextResponse.redirect(new URL("/app", origin));
}
