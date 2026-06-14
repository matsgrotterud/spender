import { describe, it, expect } from "vitest";
import { validateDynamicForm } from "@/lib/validators/category-form";
import type { FieldDef } from "@/features/categories/types";

const fields: FieldDef[] = [
  { key: "postalCode", label: "Postnummer", type: "postalCode", privacy: "private", required: true },
  {
    key: "dwellingType",
    label: "Boligtype",
    type: "select",
    privacy: "public",
    required: true,
    options: [
      { value: "apartment", label: "Leilighet" },
      { value: "house", label: "Enebolig" },
    ],
  },
  { key: "kwh", label: "Forbruk", type: "number", privacy: "private", required: true, min: 500, max: 100000 },
  { key: "hasElbil", label: "Elbil", type: "boolean", privacy: "public" },
  {
    key: "licensePlate",
    label: "Registreringsnummer",
    type: "text",
    privacy: "private",
    showIf: { key: "insuranceType", equals: "bil" },
  },
  {
    key: "insuranceType",
    label: "Type",
    type: "select",
    privacy: "public",
    required: true,
    options: [
      { value: "bil", label: "Bil" },
      { value: "innbo", label: "Innbo" },
    ],
  },
];

describe("validateDynamicForm", () => {
  it("accepts a valid payload and coerces types", () => {
    const result = validateDynamicForm(fields, {
      postalCode: "0571",
      dwellingType: "apartment",
      kwh: "12000",
      hasElbil: "on",
      insuranceType: "innbo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kwh).toBe(12000);
      expect(result.data.hasElbil).toBe(true);
    }
  });

  it("rejects missing required fields with Norwegian messages", () => {
    const result = validateDynamicForm(fields, { hasElbil: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors)).toContain("postalCode");
      expect(Object.keys(result.errors)).toContain("dwellingType");
    }
  });

  it("rejects invalid postal codes and out-of-range numbers", () => {
    const result = validateDynamicForm(fields, {
      postalCode: "12",
      dwellingType: "apartment",
      kwh: 100,
      insuranceType: "innbo",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.postalCode).toMatch(/4 siffer/);
      expect(result.errors.kwh).toMatch(/minst/);
    }
  });

  it("rejects select values outside the allowed options", () => {
    const result = validateDynamicForm(fields, {
      postalCode: "0571",
      dwellingType: "castle",
      kwh: 12000,
      insuranceType: "innbo",
    });
    expect(result.success).toBe(false);
  });

  it("only validates conditional fields when their condition is met", () => {
    const withoutCar = validateDynamicForm(fields, {
      postalCode: "0571",
      dwellingType: "apartment",
      kwh: 12000,
      insuranceType: "innbo",
    });
    expect(withoutCar.success).toBe(true);

    const withCar = validateDynamicForm(fields, {
      postalCode: "0571",
      dwellingType: "apartment",
      kwh: 12000,
      insuranceType: "bil",
      licensePlate: "EL12345",
    });
    expect(withCar.success).toBe(true);
    if (withCar.success) expect(withCar.data.licensePlate).toBe("EL12345");
  });
});
