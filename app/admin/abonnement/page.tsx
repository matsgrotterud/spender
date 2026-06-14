import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PlanManager } from "@/features/admin/plan-manager";

export default async function AdminPlansPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const plans = await db.subscriptionPlan.findMany({
    include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
    orderBy: { monthlyPriceNok: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnementsplaner</h1>
        <p className="text-sm text-muted-foreground">
          Priser, kreditter og funksjoner per plan. Stripe-pris-ID-er settes via miljøvariabler.
        </p>
      </div>

      <PlanManager
        plans={plans.map((plan) => ({
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          monthlyPriceNok: plan.monthlyPriceNok,
          includedCredits: plan.includedCredits,
          maxSeats: plan.maxSeats,
          maxActiveCampaigns: plan.maxActiveCampaigns,
          featuresJson: JSON.stringify(plan.featuresJson, null, 2),
          isActive: plan.isActive,
          activeSubscriptions: plan._count.subscriptions,
        }))}
      />
    </div>
  );
}
