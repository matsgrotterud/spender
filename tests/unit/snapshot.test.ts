import { describe, it, expect } from "vitest";
import { createPublicSnapshot } from "@/lib/privacy/snapshot";
import { CATEGORY_DEFINITIONS } from "@/features/categories/definitions";
import type { ConsumerFormSchema, SnapshotRule } from "@/features/categories/types";

const strom = CATEGORY_DEFINITIONS.find((c) => c.slug === "strom")!;

const STROM_PAYLOAD = {
  postalCode: "0571",
  dwellingType: "apartment",
  householdSizeRange: "2",
  exactAnnualKwh: 12000,
  currentSupplier: "Fjordkraft",
  currentContractType: "spot",
  hasElbil: true,
  hasSolar: false,
  wantsGreenEnergy: false,
  preferredContractType: "spot_or_fixed",
  moveInOrSwitchDate: "30d",
  acceptsDigitalInvoice: true,
};

describe("createPublicSnapshot (the privacy boundary)", () => {
  const snapshot = createPublicSnapshot(
    { consumerFormSchema: strom.consumerFormSchema, snapshotRules: strom.snapshotRules },
    STROM_PAYLOAD,
  );

  it("never includes private fields (postal code, exact kWh, current supplier)", () => {
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("0571");
    expect(serialized).not.toContain("Fjordkraft");
    expect(snapshot.fields.find((f) => f.key === "postalCode")).toBeUndefined();
    expect(snapshot.fields.find((f) => f.key === "currentSupplier")).toBeUndefined();
  });

  it("derives a coarse region and price zone from the postal code", () => {
    expect(snapshot.region).toBeTruthy();
    expect(snapshot.priceZone).toBeTruthy();
    expect(snapshot.fields.find((f) => f.key === "region")?.value).toEqual(snapshot.region);
  });

  it("converts the exact annual kWh to a range", () => {
    const field = snapshot.fields.find((f) => f.key === "exactAnnualKwh");
    expect(field?.value).toEqual("10 000–15 000 kWh");
    expect(JSON.stringify(snapshot)).not.toContain("12000");
  });

  it("renders select values with display labels but keeps raw for matching", () => {
    const dwelling = snapshot.fields.find((f) => f.key === "dwellingType");
    expect(dwelling?.value).toEqual("Leilighet");
    expect(dwelling?.raw).toEqual("apartment");
  });

  it("refuses copy rules on private fields (defense in depth)", () => {
    const schema: ConsumerFormSchema = {
      fields: [{ key: "phone", label: "Telefon", type: "text", privacy: "private" }],
    };
    const rules: SnapshotRule[] = [{ type: "copy", from: "phone", label: "Telefon" }];
    expect(() =>
      createPublicSnapshot({ consumerFormSchema: schema, snapshotRules: rules }, { phone: "900" }),
    ).toThrow(/private/);
  });

  it("skips empty values entirely", () => {
    const snapshotWithout = createPublicSnapshot(
      { consumerFormSchema: strom.consumerFormSchema, snapshotRules: strom.snapshotRules },
      { ...STROM_PAYLOAD, dwellingType: "" },
    );
    expect(snapshotWithout.fields.find((f) => f.key === "dwellingType")).toBeUndefined();
  });
});
