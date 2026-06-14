/**
 * Pricing rules engine.
 *
 * Credit costs are never hardcoded: active PricingRule rows are evaluated in
 * order against a context object. Rules are plain JSON that admins can edit.
 * Rules MUST NOT reference sensitive personal data – the context only carries
 * marketplace metadata (category, freshness, region, plan, volume).
 *
 * Rule JSON shape (PricingRuleJson):
 * {
 *   "base": 5,
 *   "modifiers": [
 *     { "description": "Ferske forespørsler koster mer",
 *       "if": { "freshnessHours": { "lt": 24 } }, "add": 2 },
 *     { "description": "Pro-rabatt",
 *       "if": { "planSlug": "pro" }, "multiply": 0.8 }
 *   ],
 *   "min": 1, "max": 100
 * }
 */
import { db } from "@/lib/db";
import type { PricingScope } from "@prisma/client";

export interface PricingContext {
  categorySlug?: string;
  region?: string | null;
  /** Hours since the demand request was published. */
  freshnessHours?: number;
  /** Subscription plan slug of the paying organization. */
  planSlug?: string;
  /** Number of recipients in a campaign send. */
  volume?: number;
  /** Number of offers the request has already received (demand level). */
  existingOfferCount?: number;
}

interface Condition {
  categorySlug?: string;
  region?: string;
  planSlug?: string;
  freshnessHours?: { lt?: number; gte?: number };
  volume?: { lt?: number; gte?: number };
  existingOfferCount?: { lt?: number; gte?: number };
}

interface Modifier {
  description: string;
  if?: Condition;
  add?: number;
  multiply?: number;
}

export interface PricingRuleJson {
  base: number;
  modifiers?: Modifier[];
  min?: number;
  max?: number;
}

export interface PriceBreakdownLine {
  description: string;
  effect: string;
}

export interface PriceResult {
  credits: number;
  breakdown: PriceBreakdownLine[];
  ruleName: string;
}

function numericMatches(
  range: { lt?: number; gte?: number } | undefined,
  value: number | undefined,
): boolean {
  if (!range) return true;
  if (value === undefined) return false;
  if (range.lt !== undefined && !(value < range.lt)) return false;
  if (range.gte !== undefined && !(value >= range.gte)) return false;
  return true;
}

function conditionMatches(cond: Condition | undefined, ctx: PricingContext): boolean {
  if (!cond) return true;
  if (cond.categorySlug !== undefined && cond.categorySlug !== ctx.categorySlug) return false;
  if (cond.region !== undefined && cond.region !== ctx.region) return false;
  if (cond.planSlug !== undefined && cond.planSlug !== ctx.planSlug) return false;
  if (!numericMatches(cond.freshnessHours, ctx.freshnessHours)) return false;
  if (!numericMatches(cond.volume, ctx.volume)) return false;
  if (!numericMatches(cond.existingOfferCount, ctx.existingOfferCount)) return false;
  return true;
}

export function evaluateRule(
  rule: PricingRuleJson,
  ctx: PricingContext,
  ruleName: string,
): PriceResult {
  let credits = rule.base;
  const breakdown: PriceBreakdownLine[] = [
    { description: "Grunnpris", effect: `${rule.base} kreditter` },
  ];

  for (const mod of rule.modifiers ?? []) {
    if (!conditionMatches(mod.if, ctx)) continue;
    if (mod.add !== undefined) {
      credits += mod.add;
      breakdown.push({
        description: mod.description,
        effect: `${mod.add >= 0 ? "+" : ""}${mod.add} kreditter`,
      });
    }
    if (mod.multiply !== undefined) {
      credits *= mod.multiply;
      breakdown.push({
        description: mod.description,
        effect: `×${mod.multiply}`,
      });
    }
  }

  if (rule.min !== undefined) credits = Math.max(rule.min, credits);
  if (rule.max !== undefined) credits = Math.min(rule.max, credits);
  credits = Math.max(0, Math.round(credits));

  return { credits, breakdown, ruleName };
}

const FALLBACK_RULES: Record<PricingScope, PricingRuleJson> = {
  SUBSCRIPTION: { base: 0 },
  CREDIT_COST: { base: 5, min: 1 },
  CONTACT_UNLOCK: { base: 10, min: 1 },
  CAMPAIGN_SEND: { base: 3, min: 1 },
};

/** Computes the credit price for an action by evaluating the first active rule for the scope. */
export async function computePrice(
  scope: PricingScope,
  ctx: PricingContext,
): Promise<PriceResult> {
  const rule = await db.pricingRule.findFirst({
    where: { scope, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!rule) {
    return evaluateRule(FALLBACK_RULES[scope], ctx, "Standardpris (ingen regel konfigurert)");
  }
  return evaluateRule(rule.ruleJson as unknown as PricingRuleJson, ctx, rule.name);
}
