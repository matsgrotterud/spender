/**
 * Explainable, deterministic offer comparison scoring.
 *
 * Every component of the score is returned as a human-readable Norwegian
 * explanation. There is no hidden model: same input always gives the same
 * score, and the consumer sees exactly why.
 *
 * Shown to consumers with the disclaimer:
 * "Dette er en forklarbar sammenligning, ikke finansiell rådgivning."
 */
import type { PublicSnapshot, ScoringConfig } from "@/features/categories/types";

export interface ScoreExplanationItem {
  label: string;
  points: number;
  detail: string;
}

export interface OfferScore {
  /** 0–100 */
  score: number;
  explanation: ScoreExplanationItem[];
}

function snapshotValue(snapshot: PublicSnapshot, key: string): string | number | boolean | undefined {
  const field = snapshot.fields.find((f) => f.key === key);
  return field?.raw ?? field?.value;
}

export function scoreOffer(
  config: ScoringConfig,
  offerPayload: Record<string, unknown>,
  snapshot: PublicSnapshot,
): OfferScore {
  const explanation: ScoreExplanationItem[] = [];
  let score = 50; // neutral baseline

  // 1. Price: compare monthly cost against a category-neutral curve.
  const monthlyCost = Number(offerPayload[config.monthlyCostKey] ?? NaN);
  if (!Number.isNaN(monthlyCost)) {
    // Deterministic, bounded: 0 kr → +25, each 100 kr costs ~2.5 points, floor -25.
    const pricePoints = Math.max(-25, Math.min(25, Math.round(25 - monthlyCost / 40)));
    score += pricePoints;
    explanation.push({
      label: "Estimert månedskostnad",
      points: pricePoints,
      detail: `Estimert kostnad er ${monthlyCost} kr/mnd. Lavere pris gir høyere poengsum.`,
    });
  }

  // 2. Fees: each nonzero fee costs points.
  for (const feeKey of config.feeKeys) {
    const fee = Number(offerPayload[feeKey] ?? 0);
    if (!Number.isNaN(fee) && fee > 0) {
      const feePoints = -Math.min(8, Math.ceil(fee / 10));
      score += feePoints;
      explanation.push({
        label: "Gebyr",
        points: feePoints,
        detail: `Tilbudet har et gebyr på ${fee} kr (${feeKey}). Gebyrer trekker ned.`,
      });
    } else if (!Number.isNaN(fee)) {
      explanation.push({
        label: "Ingen gebyr",
        points: 2,
        detail: `Ingen gebyr for ${feeKey}.`,
      });
      score += 2;
    }
  }

  // 3. Binding period: shorter is better.
  if (config.bindingKey) {
    const binding = Number(offerPayload[config.bindingKey] ?? 0);
    if (!Number.isNaN(binding)) {
      const bindingPoints = binding === 0 ? 10 : -Math.min(10, Math.ceil(binding / 3));
      score += bindingPoints;
      explanation.push({
        label: "Bindingstid",
        points: bindingPoints,
        detail:
          binding === 0
            ? "Ingen bindingstid gir full fleksibilitet."
            : `${binding} måneders bindingstid trekker ned.`,
      });
    }
  }

  // 4. Category fit rules against the consumer's public snapshot.
  for (const rule of config.fitRules) {
    if (rule.snapshotKey !== undefined && rule.snapshotEquals !== undefined) {
      const snapValue = snapshotValue(snapshot, rule.snapshotKey);
      if (snapValue !== rule.snapshotEquals) continue;
    }
    const offerValue = offerPayload[rule.offerKey];
    let matches = false;
    if (rule.offerTruthy) {
      matches = offerValue === true || offerValue === "true";
    } else if (rule.offerEquals !== undefined) {
      matches = offerValue === rule.offerEquals;
    } else if (rule.offerLte !== undefined) {
      const num = Number(offerValue ?? NaN);
      matches = !Number.isNaN(num) && num <= rule.offerLte;
    }
    if (matches) {
      score += rule.points;
      explanation.push({
        label: "Passer behovet ditt",
        points: rule.points,
        detail: rule.description,
      });
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    explanation,
  };
}
