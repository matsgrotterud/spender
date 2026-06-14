import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { OnboardingFlow } from "@/features/consumer/onboarding-flow";

export default async function OnboardingPage() {
  const user = await requireUser(["CONSUMER"]);
  const profile = await db.consumerProfile.findUnique({ where: { userId: user.id } });

  return <OnboardingFlow displayAlias={profile?.displayAlias ?? "Forbruker"} />;
}
