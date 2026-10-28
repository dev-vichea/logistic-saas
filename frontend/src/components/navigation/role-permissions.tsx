"use client";
import Link from "next/link";
import { Check, Minus, ShieldCheck, Users } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { PageHeading, NoOrganization } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const labels: Record<string, string> = {
  "organization.view": "View company profile",
  "organization.update": "Edit company profile",
  "dashboard.view": "View overview",
  "team.view": "View team members",
  "team.manage": "Manage team and invitations",
  "departments.view": "View departments",
  "departments.manage": "Manage departments",
  "audit.view": "Read activity log",
  "ownership.transfer": "Transfer organization ownership",
  "partners.view": "View partners, contacts and locations",
  "partners.manage": "Create and edit partner records",
  "partners.archive": "Archive and restore partners",
};
export function RolePermissions() {
  const { organization, catalog, can } = useWorkspace();
  if (!organization) return <NoOrganization />;
  const permissions = Array.from(
    new Set(catalog.roles.flatMap((role) => role.permissions)),
  );
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE ACCESS"
        title="Roles & permissions"
        description="A clear view of what each role can do in this organization."
        action={
          can("team.view") ? (
            <Button asChild variant="outline">
              <Link href="/team">
                <Users size={15} />
                {can("team.manage") ? "Manage team roles" : "View team"}
              </Link>
            </Button>
          ) : undefined
        }
      />
      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
        <ShieldCheck className="text-primary" size={23} />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Your role in {organization.name}:{" "}
            <span className="capitalize">{organization.role}</span>
          </p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            Roles apply to this organization. The same person can have a
            different role in another workspace.
          </p>
        </div>
        <Badge variant="secondary">
          {organization.permissions.length} permissions
        </Badge>
      </section>
      <section className="panel overflow-x-auto">
        <table className="data-table">
          <caption className="sr-only">
            Current organization role permission matrix from the server
          </caption>
          <thead>
            <tr>
              <th className="min-w-56">Permission</th>
              {catalog.roles.map((role) => (
                <th
                  key={role.value}
                  className="min-w-20 text-center capitalize"
                >
                  {role.value}
                  {role.value === organization.role && (
                    <span className="mt-1 block text-[9px] font-normal text-primary">
                      Your role
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission}>
                <th scope="row" className="!bg-white !text-xs !text-foreground">
                  {labels[permission] || permission}
                </th>
                {catalog.roles.map((role) => (
                  <td className="text-center" key={role.value}>
                    {role.permissions.includes(permission) ? (
                      <>
                        <Check size={16} className="mx-auto text-primary" />
                        <span className="sr-only">Allowed</span>
                      </>
                    ) : (
                      <>
                        <Minus
                          size={14}
                          className="mx-auto text-muted-foreground/50"
                        />
                        <span className="sr-only">Not allowed</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        These are the current workspace roles. Owners and administrators assign
        roles through Team members. Ownership changes use the separate transfer
        action.
      </p>
    </>
  );
}
