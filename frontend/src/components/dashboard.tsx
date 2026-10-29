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
  Compass,
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
        eyebrow="YOUR WORKSPACE AT A GLANCE"
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`Here’s what’s happening at ${org.name.replace(/\.$/, "")}.`}
        action={
          can("team.manage") ? (
            <Button asChild>
              <Link href="/team?invite=1">
                <Users size={16} />
                Invite a member
              </Link>
            </Button>
          ) : undefined
        }
      />
      <section className="relative mb-7 overflow-hidden rounded-2xl bg-[#0c2340] px-7 py-8 text-white sm:px-9">
        <div className="hero-grid" aria-hidden="true" />
        <div className="relative z-10 max-w-lg">
          <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold tracking-[.16em] text-blue-200">
            <span className="size-1.5 rounded-full bg-blue-300" />
            YOUR CONNECTED FOUNDATION
          </div>
          <h2 className="text-2xl font-medium tracking-tight sm:text-[28px]">
            Good logistics starts with
            <br className="hidden sm:block" /> a connected team.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-blue-100/65">
            Your companies, people and business activities.
            <br />
            One shared space to build what comes next.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex items-center gap-3 text-xs font-medium text-white"
          >
            View company profile
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="absolute right-10 top-12 hidden size-40 rotate-[-12deg] items-center justify-center rounded-3xl border border-blue-100/15 bg-white/5 xl:flex">
          <Compass
            size={88}
            strokeWidth={0.8}
            className="text-blue-100/70"
          />
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link href={c.href} key={c.label} className="metric-card group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {c.label}
              </span>
              <c.icon size={16} className="text-primary/75" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {c.value.toString().padStart(2, "0")}
            </p>
            <p className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              {c.detail}
              <ArrowUpRight size={13} className="group-hover:text-primary" />
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Set up for success</h2>
              <p>A few small steps. A stronger foundation.</p>
            </div>
            <Badge variant="secondary">{completed} of 4</Badge>
          </div>
          <div className="mx-6 mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completed * 25}%` }}
            />
          </div>
          <div className="p-4">
            {checks.map((c, i) => (
              <Link
                key={c.label}
                href={c.href}
                className="flex items-center gap-3 rounded-lg px-2 py-4 hover:bg-muted/60"
              >
                {c.done ? (
                  <CheckCircle2 size={20} className="text-primary" />
                ) : (
                  <span className="flex size-5 items-center justify-center rounded-full border text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                )}
                <span
                  className={`flex-1 text-xs ${c.done ? "text-muted-foreground" : "font-medium"}`}
                >
                  {c.label}
                </span>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
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
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-semibold text-primary">
                {org.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{org.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {catalog.countries[org.country_code]}{" "}
                  <span className="mx-1">·</span> {org.currency}
                </p>
              </div>
            </div>
            <p className="eyebrow mt-5 mb-3 text-muted-foreground">
              BUSINESS ACTIVITIES
            </p>
            <div className="flex flex-wrap gap-2">
              {org.activities.map((a) => (
                <Badge key={a} variant="secondary" className="font-normal">
                  {catalog.activities[a]}
                </Badge>
              ))}
            </div>
            <Link
              href="/settings"
              className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-primary"
            >
              Manage company details
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
      {can("audit.view") && (
        <section className="panel mt-7">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>A clear record of your workspace.</p>
            </div>
            <Link
              href="/audit"
              className="flex items-center gap-2 text-xs text-primary"
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
                <div className="size-2 rounded-full bg-blue-300" />
                <span className="flex-1 text-xs capitalize">
                  {actionLabel(event.action)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(event.created_at, org.timezone)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
