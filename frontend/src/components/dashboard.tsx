"use client";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  Network,
  Mail,
  Layers,
  CheckCircle2,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { useResource } from "@/lib/use-resource";
import type { AuditEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
  actionLabel,
  formatDate,
} from "@/components/common";
type Stats = {
  members: number;
  departments: number;
  pending_invitations: number;
  activities: number;
  recent_activity: AuditEvent[];
};
export function Dashboard() {
  const { organization: org, user, catalog, can } = useWorkspace();
  const { data, error } = useResource<{ data: Stats }>(
    org ? `/api/v1/organizations/${org.id}/dashboard` : null,
  );
  if (!org) return <NoOrganization />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const stats = data.data;
  const cards = [
    {
      label: "Team members",
      value: stats.members,
      icon: Users,
      detail: "People moving your business",
      href: "/team",
    },
    {
      label: "Departments",
      value: stats.departments,
      icon: Network,
      detail: "Teams working together",
      href: "/departments",
    },
    {
      label: "Pending invitations",
      value: stats.pending_invitations,
      icon: Mail,
      detail: "Waiting to join your workspace",
      href: "/team",
    },
    {
      label: "Business activities",
      value: stats.activities,
      icon: Layers,
      detail: "Connected logistics services",
      href: "/settings",
    },
  ];
  const checks = [
    { label: "Organization created", done: true, href: "/settings" },
    {
      label: "Complete your company profile",
      done: !!(org.legal_name && org.address && org.email),
      href: "/settings",
    },
    {
      label: "Create your first department",
      done: stats.departments > 0,
      href: "/departments",
    },
    {
      label: "Bring your team onboard",
      done: stats.members > 1,
      href: "/team",
    },
  ];
  const completed = checks.filter((c) => c.done).length;
  return (
    <>
      <PageHeading
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`Here’s what’s happening at ${org.name.replace(/\.$/, "")}.`}
        action={
          can("team.manage") ? (
            <Button asChild className="h-10 px-3.5">
              <Link href="/team?invite=1">
                <Users size={16} />
                Invite a member
              </Link>
            </Button>
          ) : undefined
        }
      />
      <section
        aria-label="Workspace metrics"
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        {cards.map((c) => (
          <Link
            href={c.href}
            key={c.label}
            className="metric-card flex min-w-0 flex-col"
          >
            <div className="flex flex-1 items-start justify-between gap-2">
              <span className="text-sm leading-snug font-medium">
                {c.label}
              </span>
              <c.icon
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-accent-foreground"
              />
            </div>
            <p className="mt-3 text-3xl leading-none font-semibold tracking-tight">
              {c.value.toLocaleString("en")}
            </p>
            <p className="mt-2 flex items-end justify-between gap-1 text-xs leading-5 text-muted-foreground">
              {c.detail}
              <ArrowUpRight
                size={14}
                aria-hidden="true"
                className="mb-0.5 shrink-0"
              />
            </p>
          </Link>
        ))}
      </section>
      <section className="brand-surface mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-xl px-5 py-5 text-white sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">
            Good logistics starts with a connected team.
          </h2>
          <p className="mt-1.5 max-w-prose text-sm leading-6 text-pretty text-blue-100">
            Your companies, people and business activities. One shared space to
            build what comes next.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200/40 px-3 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
        >
          View company profile
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Set up for success</h2>
              <p>A few small steps. A stronger foundation.</p>
            </div>
            <Badge variant="secondary">{completed} of 4</Badge>
          </div>
          <div
            aria-hidden="true"
            className="mx-6 h-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completed * 25}%` }}
            />
          </div>
          <ul className="px-4 pt-2 pb-4">
            {checks.map((c, i) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {c.done ? (
                    <CheckCircle2
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-status-success"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-[18px] shrink-0 items-center justify-center rounded-full border text-xs text-muted-foreground"
                    >
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={`flex-1 ${c.done ? "text-muted-foreground" : "font-medium"}`}
                  >
                    {c.label}
                    <span className="sr-only">
                      {c.done ? ", complete" : ", incomplete"}
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Company snapshot</h2>
              <p>Your business, in one place.</p>
            </div>
            <Building2 size={18} className="text-primary" />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 border-b pb-5">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-base font-semibold text-accent-foreground"
              >
                {org.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">
                  {org.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {catalog.countries[org.country_code]}{" "}
                  <span className="mx-1">·</span> {org.currency}
                </p>
              </div>
            </div>
            <p className="mt-5 mb-2 text-sm font-medium">Business activities</p>
            <div className="flex flex-wrap gap-2">
              {org.activities.map((a) => (
                <Badge key={a} variant="secondary" className="font-normal">
                  {catalog.activities[a]}
                </Badge>
              ))}
            </div>
            <Link
              href="/settings"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Manage company details
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
      {can("audit.view") && (
        <section className="panel mt-6">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>A clear record of your workspace.</p>
            </div>
            <Link
              href="/audit"
              className="flex shrink-0 items-center gap-2 text-sm font-medium text-accent-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="px-6 pb-4">
            {stats.recent_activity.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 border-t py-4"
              >
                <div
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-blue-400"
                />
                <span className="flex-1 text-sm capitalize">
                  {actionLabel(event.action)}
                </span>
                <time
                  dateTime={event.created_at}
                  className="shrink-0 text-xs text-muted-foreground tabular-nums"
                >
                  {formatDate(event.created_at, org.timezone)}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
