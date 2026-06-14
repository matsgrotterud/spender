import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { buildMetadata } from "@/features/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Logg inn",
  description: "Logg inn på Spender.",
  path: "/logg-inn",
  noIndex: true,
});

export default function LoginPage() {
  return (
    // LoginForm uses useSearchParams (callbackUrl) and must be suspended.
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
