import { describe, it, expect } from "vitest";
import { scoreOffer } from "@/features/offers/scoring";
import type { PublicSnapshot, ScoringConfig } from "@/features/categories/types";

const config: ScoringConfig = {
  monthlyCostKey: "monthlyPriceNok",
  feeKeys: ["setupFeeNok"],
  bindingKey: "bindingMonths",
  fitRules: [
    {
      description: "eSIM inkludert som ønsket",
      points: 8,
      snapshotKey: "needsEsim",
      snapshotEquals: true,
      offerKey: "esimIncluded",
      offerTruthy: true,
    },
  ],
};

const snapshot: PublicSnapshot = {
  fields: [{ key: "needsEsim", label: "eSIM", value: true }],
  region: "Oslo/Viken",
  priceZone: null,
};

describe("scoreOffer", () => {
  it("is deterministic", () => {
    const offer = { monthlyPriceNok: 299, setupFeeNok: 0, bindingMonths: 0, esimIncluded: true };
    const a = scoreOffer(config, offer, snapshot);
    const b = scoreOffer(config, offer, snapshot);
    expect(a).toEqual(b);
  });

  it("rewards lower price", () => {
    const cheap = scoreOffer(config, { monthlyPriceNok: 199, setupFeeNok: 0, bindingMonths: 0 }, snapshot);
    const expensive = scoreOffer(config, { monthlyPriceNok: 899, setupFeeNok: 0, bindingMonths: 0 }, snapshot);
    expect(cheap.score).toBeGreaterThan(expensive.score);
  });

  it("penalizes fees and binding", () => {
    const clean = scoreOffer(config, { monthlyPriceNok: 299, setupFeeNok: 0, bindingMonths: 0 }, snapshot);
    const fees = scoreOffer(config, { monthlyPriceNok: 299, setupFeeNok: 99, bindingMonths: 12 }, snapshot);
    expect(clean.score).toBeGreaterThan(fees.score);
  });

  it("awards fit points only when the snapshot expresses the need", () => {
    const offer = { monthlyPriceNok: 299, setupFeeNok: 0, bindingMonths: 0, esimIncluded: true };
    const withNeed = scoreOffer(config, offer, snapshot);
    const withoutNeed = scoreOffer(config, offer, {
      fields: [{ key: "needsEsim", label: "eSIM", value: false }],
      region: null,
      priceZone: null,
    });
    expect(withNeed.score).toBeGreaterThan(withoutNeed.score);
    expect(withNeed.explanation.some((e) => e.detail.includes("eSIM"))).toBe(true);
  });

  it("explains every component in plain language", () => {
    const result = scoreOffer(
      config,
      { monthlyPriceNok: 299, setupFeeNok: 49, bindingMonths: 6, esimIncluded: true },
      snapshot,
    );
    expect(result.explanation.length).toBeGreaterThanOrEqual(4);
    for (const item of result.explanation) {
      expect(item.detail.length).toBeGreaterThan(5);
      expect(typeof item.points).toBe("number");
    }
  });

  it("clamps the score to 0–100", () => {
    const result = scoreOffer(config, { monthlyPriceNok: 0, setupFeeNok: 0, bindingMonths: 0, esimIncluded: true }, snapshot);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
