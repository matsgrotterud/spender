import type { PublicSnapshot } from "@/features/categories/types";
import { Check, X } from "lucide-react";

/** Renders a public snapshot exactly as a business sees it. */
export function SnapshotView({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {snapshot.fields.map((field) => (
        <div key={`${field.key}-${field.label}`} className="flex flex-col">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {field.label}
          </dt>
          <dd className="text-sm font-medium">
            {typeof field.value === "boolean" ? (
              field.value ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Ja
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <X className="h-3.5 w-3.5" aria-hidden /> Nei
                </span>
              )
            ) : (
              String(field.value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
