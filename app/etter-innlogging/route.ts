import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

/** Redirects a freshly logged-in user to the dashboard matching their role. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${env.appUrl}/logg-inn`);
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return NextResponse.redirect(`${env.appUrl}/admin`);
  }
  if (user.role === "BUSINESS_OWNER" || user.role === "BUSINESS_MEMBER") {
    return NextResponse.redirect(`${env.appUrl}/bedrift/app`);
  }
  return NextResponse.redirect(`${env.appUrl}/app`);
}
