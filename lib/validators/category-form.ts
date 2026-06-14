/**
 * Builds a Zod schema from a category's FieldDef list so every dynamic form
 * submission is validated server-side against the schema stored in the DB.
 */
import { z } from "zod";
import type { FieldDef } from "@/features/categories/types";

function fieldToZod(field: FieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  switch (field.type) {
    case "number": {
      let num = z.coerce.number().finite();
      if (field.min !== undefined) num = num.min(field.min, `${field.label}: minst ${field.min}`);
      if (field.max !== undefined) num = num.max(field.max, `${field.label}: maks ${field.max}`);
      schema = num;
      break;
    }
    case "boolean":
      schema = z.preprocess(
        (v) => v === true || v === "true" || v === "on" || v === "1",
        z.boolean(),
      );
      break;
    case "select": {
      const values = (field.options ?? []).map((o) => o.value);
      schema =
        values.length > 0
          ? z.enum(values as [string, ...string[]])
          : z.string().min(1);
      break;
    }
    case "postalCode":
      schema = z
        .string()
        .regex(/^\d{4}$/, `${field.label} må være 4 siffer`);
      break;
    case "date":
      schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${field.label}: ugyldig dato`);
      break;
    case "textarea":
      schema = z.string().trim().max(2000, `${field.label}: maks 2000 tegn`);
      break;
    case "text":
    default:
      schema = z.string().trim().max(300, `${field.label}: maks 300 tegn`);
      break;
  }

  if (!field.required) {
    if (field.type === "boolean") return schema.default(false);
    return schema.optional().or(z.literal("").transform(() => undefined));
  }
  if (field.type === "text" || field.type === "textarea") {
    return (schema as z.ZodString).min(1, `${field.label} er påkrevd`);
  }
  return schema;
}

export function buildZodSchema(fields: FieldDef[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = fieldToZod(field);
  }
  return z.object(shape);
}

/**
 * Validates a dynamic form payload. Conditional fields (showIf) are only
 * required when their condition is met.
 */
export function validateDynamicForm(
  fields: FieldDef[],
  payload: Record<string, unknown>,
): { success: true; data: Record<string, unknown> } | { success: false; errors: Record<string, string> } {
  const applicable = fields.filter((f) => {
    if (!f.showIf) return true;
    const actual = payload[f.showIf.key];
    const expected = f.showIf.equals;
    if (typeof expected === "boolean") {
      return (actual === true || actual === "true" || actual === "on") === expected;
    }
    return actual === expected;
  });

  const schema = buildZodSchema(applicable);
  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
