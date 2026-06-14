import type { Metadata } from "next";
import { BusinessRegisterForm } from "@/features/auth/business-register-form";
import { buildMetadata } from "@/features/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Registrer bedrift",
  description: "Registrer bedriften din på Spender og møt kunder som faktisk ønsker tilbud.",
  path: "/bedrift/registrer",
  noIndex: true,
});

export default function BusinessRegisterPage() {
  return <BusinessRegisterForm />;
}
