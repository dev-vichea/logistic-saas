"use client";
import Link from "next/link";
import { Plus, Building2, ArrowUpRight, Globe2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useWorkspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeading, NoOrganization, ErrorBox } from "@/components/common";
export function Organizations() {
  const { organizations, organization, catalog, refresh } = useWorkspace();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function select(id: number) {
    setBusy(true);
    try {
      await api.post(`/api/v1/organizations/${id}/switch`);
      await refresh();
      router.push("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS NETWORK"
        title="Organizations"
        description="One account. A connected view of every company you belong to."
        action={
          <Button asChild>
            <Link href="/organizations/new">
              <Plus size={16} />
              Create organization
            </Link>
          </Button>
        }
      />
      <ErrorBox message={error} />
      {!organizations.length ? (
        <NoOrganization />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((org) => (
            <section className="panel p-6" key={org.id}>
              <div className="flex justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <Building2 size={23} />
                </div>
                <Badge
                  variant={
                    organization?.id === org.id ? "default" : "secondary"
                  }
                  className="h-6 text-[10px]"
                >
                  {organization?.id === org.id ? "Current workspace" : org.role}
                </Badge>
              </div>
              <h2 className="mt-5 text-base font-semibold">{org.name}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe2 size={12} />
                {catalog.countries[org.country_code]} · {org.currency}
              </p>
              <div className="mt-5 flex min-h-12 flex-wrap content-start gap-1.5">
                {org.activities.map((a) => (
                  <Badge
                    key={a}
                    variant="secondary"
                    className="h-5 text-[9px] font-normal"
                  >
                    {catalog.activities[a]}
                  </Badge>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-[10px] capitalize text-muted-foreground">
                  Your role: {org.role}
                </span>
                {organization?.id === org.id ? (
                  <Link
                    href="/settings"
                    className="flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    Settings
                    <ArrowUpRight size={14} />
                  </Link>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => select(org.id)}
                    className="flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    Open workspace
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
