/**
 * createPublicSnapshot – the privacy boundary of Spender.
 *
 * Takes the consumer's full (private) answers plus the category's snapshot
 * rules and produces the ONLY representation businesses are allowed to see.
 * Anything not explicitly produced by a rule stays encrypted and private.
 */
import type {
  ConsumerFormSchema,
  FieldDef,
  PublicSnapshot,
  SnapshotField,
  SnapshotRule,
} from "@/features/categories/types";
import { postalCodeToRegion } from "./regions";

function optionLabel(field: FieldDef | undefined, value: unknown): string | null {
  if (!field?.options) return null;
  const opt = field.options.find((o) => o.value === value);
  return opt?.label ?? null;
}

function displayValue(field: FieldDef | undefined, value: unknown): string | number | boolean {
  if (typeof value === "boolean") return value;
  const label = optionLabel(field, value);
  if (label !== null) return label;
  if (typeof value === "number") return value;
  return String(value ?? "");
}

export function createPublicSnapshot(
  category: {
    consumerFormSchema: ConsumerFormSchema;
    snapshotRules: SnapshotRule[];
  },
  privatePayload: Record<string, unknown>,
): PublicSnapshot {
  const fields: SnapshotField[] = [];
  let region: string | null = null;
  let priceZone: string | null = null;

  const fieldDefs = new Map(category.consumerFormSchema.fields.map((f) => [f.key, f]));

  for (const rule of category.snapshotRules) {
    const raw = privatePayload[rule.from];
    if (raw === undefined || raw === null || raw === "") continue;

    switch (rule.type) {
      case "copy": {
        const def = fieldDefs.get(rule.from);
        // Defense in depth: a "copy" rule must never expose a private field.
        if (def && def.privacy === "private") {
          throw new Error(
            `Snapshot rule "copy" on private field "${rule.from}" is not allowed`,
          );
        }
        fields.push({
          key: rule.from,
          label: rule.label,
          value: displayValue(def, raw),
          raw: raw as string | number | boolean,
        });
        break;
      }
      case "map": {
        const mapped = rule.mapping[String(raw)] ?? rule.fallback;
        if (mapped !== undefined) {
          fields.push({ key: rule.from, label: rule.label, value: mapped });
        }
        break;
      }
      case "postalCodeToRegion": {
        const info = postalCodeToRegion(String(raw));
        region = info.region;
        fields.push({ key: "region", label: rule.label, value: info.region });
        if (rule.includePriceZone) {
          priceZone = info.priceZone;
          fields.push({ key: "priceZone", label: "Prisområde", value: info.priceZone });
        }
        break;
      }
      case "numberToRange": {
        const num = Number(raw);
        if (Number.isNaN(num)) break;
        const bucket = rule.buckets.find((b) => num <= b.max);
        fields.push({
          key: rule.from,
          label: rule.label,
          value: bucket ? bucket.label : rule.overflowLabel,
        });
        break;
      }
    }
  }

  return { fields, region, priceZone };
}

/**
 * Splits raw consumer answers into the private payload (everything) and the
 * list of keys that the snapshot will surface – used by the publish preview.
 */
export function getSnapshotSourceKeys(rules: SnapshotRule[]): Set<string> {
  return new Set(rules.map((r) => r.from));
}
