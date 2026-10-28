"use client";
import Link from "next/link";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow && <p className="eyebrow mb-2 text-primary">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-muted-foreground">
      <Loader2 size={18} className="animate-spin" />
      Loading workspace…
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div
      role="alert"
      className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {message}
    </div>
  ) : null;
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-primary">
        <Building2 size={22} />
      </div>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
export function NoOrganization() {
  return (
    <Empty
      title="Make room for your business"
      description="Create your first organization to bring your company details and team into one workspace."
      action={
        <Button asChild>
          <Link href="/organizations/new">
            Create organization
            <ArrowRight size={16} />
          </Link>
        </Button>
      }
    />
  );
}
export function Pagination({
  page,
  last,
  onChange,
}: {
  page: number;
  last: number;
  onChange: (n: number) => void;
}) {
  return last > 1 ? (
    <div className="mt-5 flex items-center justify-end gap-4 text-xs">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {page} of {last}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= last}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  ) : null;
}
export function formatDate(value: string, timezone = "Asia/Phnom_Penh") {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}
export function actionLabel(value: string) {
  return value.replaceAll(".", " ").replaceAll("_", " ");
}
