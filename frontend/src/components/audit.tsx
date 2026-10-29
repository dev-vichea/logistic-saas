"use client";

import { useState, useMemo } from "react";
import { type ColDef } from "ag-grid-community";
import { type CustomCellRendererProps } from "ag-grid-react";
import { History, User } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { useResource } from "@/lib/use-resource";
import type { AuditEvent, Paginated } from "@/lib/types";
import {
  NoOrganization,
  Loading,
  ErrorBox,
  Empty,
  actionLabel,
  formatDate,
} from "@/components/common";
import { MekongDataGrid } from "@/components/ui/data-grid";
import {
  WorkspaceHeaderSlot,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function Audit() {
  const { organization: org, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");

  const { data, error } = useResource<Paginated<AuditEvent>>(
    org && can("audit.view")
      ? `/api/v1/organizations/${org.id}/audit-events?per_page=100`
      : null
  );

  const events = data?.data || [];

  const columnDefs = useMemo<ColDef<AuditEvent>[]>(
    () => [
      {
        headerName: "AUDIT EVENT",
        field: "action",
        width: 200,
        valueGetter: (params) => (params.data ? actionLabel(params.data.action) : ""),
        cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
          const e = params.data;
          if (!e) return null;
          return (
            <div className="flex items-center h-full text-xs font-semibold text-slate-800">
              {actionLabel(e.action)}
            </div>
          );
        },
      },
      {
        headerName: "ACTOR / USER",
        field: "actor_id",
        width: 160,
        valueGetter: (params) => (params.data?.actor_id ? `User #${params.data.actor_id}` : "System"),
        cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
          const e = params.data;
          if (!e) return null;
          return (
            <div className="flex items-center gap-1.5 h-full text-xs text-slate-700">
              <User size={13} className="text-slate-400 shrink-0" />
              <span>{e.actor_id ? `User #${e.actor_id}` : "System"}</span>
            </div>
          );
        },
      },
      {
        headerName: "AUDIT METADATA & PAYLOAD",
        minWidth: 320,
        flex: 2,
        valueGetter: (params) =>
          params.data && Object.keys(params.data.metadata || {}).length
            ? JSON.stringify(params.data.metadata)
            : "",
        cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
          const e = params.data;
          if (!e) return null;
          const hasMeta = Object.keys(e.metadata || {}).length > 0;
          return (
            <div className="flex items-center h-full py-1">
              <code className="text-[11px] text-slate-600 font-mono truncate bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded">
                {hasMeta ? JSON.stringify(e.metadata) : "—"}
              </code>
            </div>
          );
        },
      },
      {
        headerName: "RECORDED AT",
        field: "created_at",
        width: 200,
        cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
          const e = params.data;
          if (!e || !org) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1 leading-tight text-xs text-slate-700">
              <span className="font-medium">{formatDate(e.created_at, org.timezone)}</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {new Intl.DateTimeFormat("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: org.timezone,
                }).format(new Date(e.created_at))}
              </span>
            </div>
          );
        },
      },
    ],
    [org]
  );

  if (!org) return <NoOrganization />;
  if (!can("audit.view"))
    return (
      <ErrorBox message="Only owners and administrators can view the activity log." />
    );
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div className="flex flex-col h-full w-full">
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Audit & Activity Log"
        icon={History}
        tabs={[{ id: "all", label: "All Activity", count: events.length }]}
        activeTab="all"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search audit events, actions, users..."
        subHeader={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest events" },
                  { value: "action", label: "Event action" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {events.length === 0 ? (
        <div className="p-8">
          <Empty
            title="No Activity Logged"
            description="No system or user audit events have been recorded yet."
          />
        </div>
      ) : (
        <MekongDataGrid<AuditEvent>
          rowData={events}
          columnDefs={columnDefs}
          title="Immutable Activity Log"
          quickFilterPlaceholder="Quick search events, actions..."
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
