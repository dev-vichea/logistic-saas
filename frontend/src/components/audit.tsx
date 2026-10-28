"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { useResource } from "@/lib/use-resource";
import type { AuditEvent, Paginated } from "@/lib/types";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
  Pagination,
  actionLabel,
  formatDate,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";
export function Audit() {
  const { organization: org, can } = useWorkspace();
  const [page, setPage] = useState(1);
  const { data, error } = useResource<Paginated<AuditEvent>>(
    org && can("audit.view")
      ? `/api/v1/organizations/${org.id}/audit-events?page=${page}`
      : null,
  );
  if (!org) return <NoOrganization />;
  if (!can("audit.view"))
    return (
      <ErrorBox message="Only owners and administrators can view the activity log." />
    );
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTABILITY, BUILT IN"
        title="Activity log"
        description="A chronological record of changes made to this organization."
      />
      <ErrorBox message={error} />
      {!data ? (
        <Loading />
      ) : (
        <>
          <section className="panel overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Details</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Badge variant="secondary" className="capitalize">
                        {actionLabel(e.action)}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">
                      {e.actor_id ? `User #${e.actor_id}` : "System"}
                    </td>
                    <td>
                      <code className="break-all text-[10px] text-muted-foreground">
                        {Object.keys(e.metadata).length
                          ? JSON.stringify(e.metadata)
                          : "—"}
                      </code>
                    </td>
                    <td className="whitespace-nowrap text-muted-foreground">
                      {formatDate(e.created_at, org.timezone)}
                      <span className="mt-1 block text-[10px]">
                        {new Intl.DateTimeFormat("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: org.timezone,
                        }).format(new Date(e.created_at))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <Pagination page={page} last={data.last_page} onChange={setPage} />
        </>
      )}
    </>
  );
}
