import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PricingRuleManager } from "@/features/admin/pricing-rule-manager";

export default async function AdminPricingRulesPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const rules = await db.pricingRule.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prisregler</h1>
        <p className="text-sm text-muted-foreground">
          Regler beregner kredittkostnad for tilbud, kampanjer og kontaktopplåsing. Reglene kan
          bruke kategori, region, ferskhet, etterspørsel og plan – aldri sensitiv persondata.
        </p>
      </div>

      <PricingRuleManager
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          scope: rule.scope,
          ruleJson: JSON.stringify(rule.ruleJson, null, 2),
          isActive: rule.isActive,
        }))}
      />
    </div>
  );
}
