import { describe, it, expect } from "vitest";
import { evaluateRule, type PricingRuleJson } from "@/lib/pricing/engine";

const rule: PricingRuleJson = {
  base: 5,
  modifiers: [
    { description: "Fersk forespørsel", if: { freshnessHours: { lt: 24 } }, add: 2 },
    { description: "Pro-rabatt", if: { planSlug: "pro" }, multiply: 0.8 },
    { description: "Volumrabatt", if: { volume: { gte: 20 } }, multiply: 0.8 },
  ],
  min: 1,
  max: 50,
};

describe("pricing engine", () => {
  it("returns the base price when no modifiers match", () => {
    const result = evaluateRule(rule, { freshnessHours: 100 }, "test");
    expect(result.credits).toBe(5);
    expect(result.breakdown[0]?.description).toBe("Grunnpris");
  });

  it("adds for fresh requests", () => {
    const result = evaluateRule(rule, { freshnessHours: 2 }, "test");
    expect(result.credits).toBe(7);
  });

  it("applies plan discounts multiplicatively", () => {
    const result = evaluateRule(rule, { freshnessHours: 100, planSlug: "pro" }, "test");
    expect(result.credits).toBe(4); // 5 * 0.8
  });

  it("stacks modifiers and rounds", () => {
    const result = evaluateRule(rule, { freshnessHours: 2, planSlug: "pro", volume: 25 }, "test");
    // (5 + 2) * 0.8 * 0.8 = 4.48 → 4
    expect(result.credits).toBe(4);
    expect(result.breakdown).toHaveLength(4);
  });

  it("enforces min and max bounds", () => {
    const tiny = evaluateRule({ base: 0, min: 1 }, {}, "test");
    expect(tiny.credits).toBe(1);
    const huge = evaluateRule({ base: 500, max: 50 }, {}, "test");
    expect(huge.credits).toBe(50);
  });

  it("explains every applied modifier", () => {
    const result = evaluateRule(rule, { freshnessHours: 2, planSlug: "pro" }, "test");
    const descriptions = result.breakdown.map((b) => b.description);
    expect(descriptions).toContain("Fersk forespørsel");
    expect(descriptions).toContain("Pro-rabatt");
    expect(descriptions).not.toContain("Volumrabatt");
  });
});
