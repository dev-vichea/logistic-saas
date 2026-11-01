"use client";

import { useState, useMemo } from "react";
import { type ColDef, type ColGroupDef } from "ag-grid-community";
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
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function Audit() {
  const { organization: org, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeView, setActiveView] = useState("default");

  const { data, error } = useResource<Paginated<AuditEvent>>(
    org && can("audit.view")
      ? `/api/v1/organizations/${org.id}/audit-events?per_page=100`
      : null
  );

  const rawEvents = useMemo(() => data?.data || [], [data?.data]);

  const hasActiveFilters = dateFilter !== "all" || search.trim() !== "";

  const resetAllFilters = () => {
    setDateFilter("all");
    setSearch("");
  };

  const events = useMemo(() => {
    return rawEvents.filter((e) => {
      if (dateFilter !== "all" && e.created_at) {
        const d = new Date(e.created_at);
        const now = new Date();
        if (dateFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this_week") {
          const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diff < -1 || diff > 7) return false;
        } else if (dateFilter === "this_month") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [rawEvents, dateFilter]);

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<AuditEvent> | ColGroupDef<AuditEvent>)[]>(() => {
    const allCols: (ColDef<AuditEvent> | ColGroupDef<AuditEvent>)[] = [
      {
        headerName: "Audit Event",
        field: "action",
        width: 180,
        pinned: "left",
        valueGetter: (params) => (params.data ? actionLabel(params.data.action) : ""),
        cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
          const e = params.data;
          if (!e) return null;
          return (
            <div className="flex items-center h-full text-xs font-semibold text-slate-900">
              {actionLabel(e.action)}
            </div>
          );
        },
      },
      {
        headerName: "Actor & Security",
        headerClass: "ag-group-shipper",
        children: [
          {
            headerName: "User / Identity",
            field: "actor_id",
            width: 150,
            valueGetter: (params) => (params.data?.actor_id ? `User #${params.data.actor_id}` : "System"),
            cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
              const e = params.data;
              if (!e) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs text-slate-700 font-medium">
                  <User size={13} className="text-slate-400 shrink-0" />
                  <span>{e.actor_id ? `User #${e.actor_id}` : "System"}</span>
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Payload & Changes",
        headerClass: "ag-group-service",
        children: [
          {
            headerName: "Metadata JSON",
            minWidth: 260,
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
                  <code className="text-[11px] text-slate-600 font-mono truncate bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded max-w-full">
                    {hasMeta ? JSON.stringify(e.metadata) : "—"}
                  </code>
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Timing",
        headerClass: "ag-group-schedule",
        children: [
          {
            headerName: "Recorded At",
            field: "created_at",
            width: 175,
            cellRenderer: (params: CustomCellRendererProps<AuditEvent>) => {
              const e = params.data;
              if (!e || !org) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-mono text-slate-600">
                  <span>{formatDate(e.created_at, org.timezone)}</span>
                  <span className="text-slate-400 text-[10px]">
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
      },
    ];

    if (activeView === "security") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Audit Event", "Actor & Security", "Timing"].includes(name || "");
      });
    }
    return allCols;
  }, [org, activeView]);

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
        tabs={[{ id: "all", label: "All Activity", count: rawEvents.length }]}
        activeTab="all"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search audit events, actions, users..."
        subHeader={
          <>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingDateFilter
                label="Timestamp"
                value={dateFilter}
                onChange={setDateFilter}
              />
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ViewPresetSelector
                activeView={activeView}
                presets={[
                  { id: "default", label: "Default View", desc: "All event details & metadata" },
                  { id: "security", label: "Security & Actor", desc: "Identity & timestamp" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
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
