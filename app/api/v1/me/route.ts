import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { getCreditBalance } from "@/lib/pricing/credits";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "read");
  if (!auth.ok) return auth.response;
  const { organization, apiKey, scopes } = auth.ctx;

  const [subscription, balance] = await Promise.all([
    db.subscription.findFirst({
      where: { organizationId: organization.id, status: "ACTIVE" },
      include: { plan: { select: { slug: true, name: true } } },
    }),
    getCreditBalance(organization.id),
  ]);

  return NextResponse.json({
    organization: {
      id: organization.id,
      name: organization.name,
      orgNumber: organization.orgNumber,
      status: organization.status,
    },
    plan: subscription ? { slug: subscription.plan.slug, name: subscription.plan.name } : null,
    creditBalance: balance,
    apiKey: { name: apiKey.name, prefix: apiKey.keyPrefix, scopes },
  });
}
