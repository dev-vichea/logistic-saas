import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RecordPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-100">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function RecordField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function RecordProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2" aria-label="Record progress">
      {steps.map((step, index) => (
        <li key={step} className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm ${index <= current ? "border-blue-200 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
          <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${index <= current ? "bg-blue-900 text-white" : "bg-slate-200 text-slate-500"}`}>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
