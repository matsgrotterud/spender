/**
 * Typed schema abstraction for categories.
 *
 * Each Category row stores three JSON documents that conform to these types:
 *  - consumerFormSchemaJson:  ConsumerFormSchema  (what the consumer fills in)
 *  - businessOfferSchemaJson: OfferSchema         (what an offer contains + scoring config)
 *  - publicSnapshotRulesJson: SnapshotRule[]      (how private answers become a public snapshot)
 *
 * Admins can add new categories purely as data – no code changes required.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "date"
  | "postalCode";

export type FieldPrivacy = "private" | "public";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /**
   * "private": stored encrypted only, never in the public snapshot
   * "public": may be copied to the public snapshot by a snapshot rule
   * Note: even "public" fields only reach businesses via an explicit SnapshotRule.
   */
  privacy: FieldPrivacy;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  /** Show this field only when another field has a given value. */
  showIf?: { key: string; equals: string | boolean };
}

export interface ConsumerFormSchema {
  fields: FieldDef[];
}

/** Rules that derive the privacy-safe public snapshot from the private payload. */
export type SnapshotRule =
  | {
      /** Copy a public field's value (and option label) directly. */
      type: "copy";
      from: string;
      label: string;
    }
  | {
      /** Map a private value to a coarser public value, e.g. exact kWh -> range. */
      type: "map";
      from: string;
      label: string;
      mapping: Record<string, string>;
      fallback?: string;
    }
  | {
      /** Derive coarse region + price zone from a private postal code. */
      type: "postalCodeToRegion";
      from: string;
      label: string;
      includePriceZone?: boolean;
    }
  | {
      /** Bucket a private number into a labelled range. */
      type: "numberToRange";
      from: string;
      label: string;
      buckets: { max: number; label: string }[];
      overflowLabel: string;
    };

export interface SnapshotField {
  key: string;
  label: string;
  /** Display value shown to businesses (option labels, ranges, booleans). */
  value: string | number | boolean;
  /** Raw machine value, used for filtering and scoring. */
  raw?: string | number | boolean;
}

/** The exact shape stored in DemandRequest.publicSnapshotJson. */
export interface PublicSnapshot {
  fields: SnapshotField[];
  region: string | null;
  priceZone: string | null;
}

/** Explainable scoring configuration evaluated by features/offers/scoring.ts. */
export interface ScoringConfig {
  /** Offer field holding estimated monthly cost in NOK; lower is better. */
  monthlyCostKey: string;
  /** Numeric offer fields treated as fees; each nonzero fee reduces the score. */
  feeKeys: string[];
  /** Offer field holding binding period in months; shorter is better. */
  bindingKey?: string;
  /** Category fit rules: award points when offer matches the consumer's snapshot. */
  fitRules: {
    description: string;
    points: number;
    snapshotKey?: string;
    snapshotEquals?: string | number | boolean;
    offerKey: string;
    offerEquals?: string | number | boolean;
    offerTruthy?: boolean;
    /** Award points when the numeric offer value is <= this threshold. */
    offerLte?: number;
  }[];
}

export interface OfferSchema {
  fields: FieldDef[];
  scoring: ScoringConfig;
}
