import type { Metadata } from "next";
import { ConsumerRegisterForm } from "@/features/auth/consumer-register-form";
import { buildMetadata } from "@/features/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Opprett konto",
  description: "Opprett gratis forbrukerkonto på Spender og få tilbud uten å bli nedringt.",
  path: "/registrer",
  noIndex: true,
});

export default function RegisterPage() {
  return <ConsumerRegisterForm />;
}
