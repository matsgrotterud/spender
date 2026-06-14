"use client";

import { useState } from "react";
import type { FieldDef } from "@/features/categories/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";

interface DynamicFormFieldsProps {
  fields: FieldDef[];
  defaultValues?: Record<string, unknown>;
  errors?: Record<string, string>;
  /** Show privacy labels next to each field (used in consumer request forms). */
  showPrivacyLabels?: boolean;
}

/**
 * Renders a category's FieldDef list as form inputs (name=field.key) inside a
 * parent <form>. Handles conditional visibility (showIf). Validation happens
 * server-side via lib/validators/category-form.ts.
 */
export function DynamicFormFields({
  fields,
  defaultValues = {},
  errors = {},
  showPrivacyLabels = false,
}: DynamicFormFieldsProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) {
      initial[f.key] = defaultValues[f.key] ?? (f.type === "boolean" ? false : "");
    }
    return initial;
  });

  const setValue = (key: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const isVisible = (field: FieldDef): boolean => {
    if (!field.showIf) return true;
    const actual = values[field.showIf.key];
    if (typeof field.showIf.equals === "boolean") {
      return Boolean(actual) === field.showIf.equals;
    }
    return actual === field.showIf.equals;
  };

  return (
    <div className="space-y-5">
      {fields.filter(isVisible).map((field) => (
        <div key={field.key} className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            {showPrivacyLabels && (
              <PrivacyBadge level={field.privacy === "private" ? "private" : "public"} />
            )}
          </div>

          {field.type === "select" && (
            <Select
              id={field.key}
              name={field.key}
              required={field.required}
              value={String(values[field.key] ?? "")}
              onChange={(e) => setValue(field.key, e.target.value)}
            >
              <option value="" disabled>
                Velg …
              </option>
              {(field.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}

          {field.type === "boolean" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name={field.key}
                checked={Boolean(values[field.key])}
                onChange={(e) => setValue(field.key, e.target.checked)}
                className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
              />
              Ja
            </label>
          )}

          {field.type === "textarea" && (
            <Textarea
              id={field.key}
              name={field.key}
              required={field.required}
              placeholder={field.placeholder}
              value={String(values[field.key] ?? "")}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
          )}

          {(field.type === "text" ||
            field.type === "number" ||
            field.type === "date" ||
            field.type === "postalCode") && (
            <Input
              id={field.key}
              name={field.key}
              required={field.required}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              inputMode={field.type === "postalCode" ? "numeric" : undefined}
              pattern={field.type === "postalCode" ? "[0-9]{4}" : undefined}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              value={String(values[field.key] ?? "")}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
          )}

          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {errors[field.key] && (
            <p className="text-xs font-medium text-destructive">{errors[field.key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
