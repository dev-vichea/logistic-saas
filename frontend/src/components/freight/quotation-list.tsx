"use client";

import { useState, useMemo, useCallback } from "react";
import {
  FileText,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Quotation, type FreightCatalog } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewQuotationDialog } from "./new-quotation-dialog";
import {
  WorkspaceHeaderSlot,
  FilterPill,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function QuotationList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const catalogRes = useResource<{ data: FreightCatalog }>(
    organization ? `${freightRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const quotationsRes = useResource<Paginated<Quotation>>(
    organization ? `${freightRoot(organization.id)}/quotations?${queryParams.toString()}` : null
  );

  const catalog = catalogRes.data?.data;
  const rawQuotations = quotationsRes.data?.data || [];

  const quotations = rawQuotations.filter((q) =>
    modeFilter === "all" ? true : q.transport_mode === modeFilter
  );

  const handleStatusUpdate = useCallback(
    async (id: number, status: string) => {
      if (!organization) return;
      setUpdatingId(id);
      try {
        await api.post(`${freightRoot(organization.id)}/quotations/${id}/status`, { status });
        quotationsRes.reload();
      } catch (err) {
        alert(errorMessage(err));
      } finally {
        setUpdatingId(null);
      }
    },
    [organization, quotationsRes]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Accepted</Badge>;
      case "sent":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">Sent to Client</Badge>;
      case "rejected":
        return <Badge className="bg-red-50 text-red-800 border-red-200">Rejected</Badge>;
      case "expired":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Expired</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Draft</Badge>;
    }
  };

  const columnDefs = useMemo<ColDef<Quotation>[]>(
    () => [
      {
        field: "quotation_number",
        headerName: "Quotation # & Revision",
        minWidth: 190,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-semibold text-slate-900 font-mono text-xs">{q.quotation_number}</span>
                <span className="text-[11px] font-mono text-slate-500 font-medium">
                  R{q.revision}
                </span>
              </div>
              {q.valid_until && (
                <span className="text-[10px] font-mono text-slate-400 mt-1 leading-none">
                  Valid until: {new Date(q.valid_until).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: "customer.name",
        headerName: "Customer",
        minWidth: 200,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex items-center gap-1.5 h-full text-xs font-medium text-slate-800">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{q.customer?.name || `Customer #${q.customer_id}`}</span>
            </div>
          );
        },
      },
      {
        field: "transport_mode",
        headerName: "Mode & Incoterm",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <span className="capitalize text-slate-800 font-medium text-xs leading-none">
                {q.transport_mode.replace(/_/g, " ")}
              </span>
              {q.incoterm && (
                <span className="text-[10px] font-mono text-slate-400 mt-1 leading-none">
                  {q.incoterm}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Route",
        minWidth: 220,
        valueGetter: (params) => {
          const q = params.data;
          if (!q) return "";
          return `${q.origin_location?.name || q.origin_location?.city || q.origin_location_id} to ${q.destination_location?.name || q.destination_location?.city || q.destination_location_id}`;
        },
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex items-center gap-1 h-full text-xs text-slate-700">
              <span className="truncate font-medium">{q.origin_location?.city || q.origin_location?.name || `Loc #${q.origin_location_id}`}</span>
              <ArrowRight size={11} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{q.destination_location?.city || q.destination_location?.name || `Loc #${q.destination_location_id}`}</span>
            </div>
          );
        },
      },
      {
        field: "total_amount",
        headerName: "Total Quote Amount",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex items-center h-full font-mono font-bold text-xs text-slate-900">
              {q.currency} {Number(q.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 140,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return <div className="flex items-center h-full">{getStatusBadge(q.status)}</div>;
        },
      },
      {
        headerName: "Actions",
        width: 160,
        pinned: "right",
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex items-center justify-end gap-1.5 h-full">
              {can("freight.manage") && q.status === "draft" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === q.id}
                  onClick={() => handleStatusUpdate(q.id, "sent")}
                  className="h-6 text-[11px] px-2"
                >
                  Mark Sent
                </Button>
              )}
              {can("freight.manage") && q.status === "sent" && (
                <Button
                  size="sm"
                  disabled={updatingId === q.id}
                  onClick={() => handleStatusUpdate(q.id, "accepted")}
                  className="h-6 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Accept
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [can, updatingId, handleStatusUpdate]
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (quotationsRes.error) return <ErrorBox message={quotationsRes.error} />;
  if (!catalogRes.data || !catalog) return <Loading />;

  return (
    <>
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Quotations"
        icon={FileText}
        tabs={[
          { id: "all", label: "All Quotes", count: rawQuotations.length },
          { id: "draft", label: "Draft" },
          { id: "sent", label: "Sent to Client", icon: Clock },
          { id: "accepted", label: "Accepted", icon: CheckCircle2 },
          { id: "rejected", label: "Rejected", icon: XCircle },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quotation #, customer..."
        primaryAction={
          can("freight.manage") ? (
            <NewQuotationDialog catalog={catalog} onCreated={quotationsRes.reload} />
          ) : null
        }
        subHeader={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
              <FilterPill
                label="Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Sent to Client" },
                  { value: "accepted", label: "Accepted" },
                  { value: "rejected", label: "Rejected" },
                  { value: "expired", label: "Expired" },
                ]}
                onChange={setStatusFilter}
              />
              <FilterPill
                label="Mode"
                value={modeFilter}
                options={[
                  { value: "all", label: "All Modes" },
                  { value: "road", label: "Road Freight" },
                  { value: "ocean_fcl", label: "Ocean FCL" },
                  { value: "ocean_lcl", label: "Ocean LCL" },
                  { value: "air", label: "Air Cargo" },
                ]}
                onChange={setModeFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest created" },
                  { value: "valid_until", label: "Expiry date" },
                  { value: "amount", label: "Quote value" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!quotationsRes.data && !quotationsRes.error ? (
        <Loading />
      ) : quotations.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No quotations found"
            description={
              search || statusFilter !== "all"
                ? "No quotations match your current filters or search query."
                : "Quotations generated for customer freight inquiries will appear here with full revision history."
            }
            action={can("freight.manage") ? <NewQuotationDialog catalog={catalog} onCreated={quotationsRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Quotation>
            rowData={quotations}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in quotations..."
          />
        </div>
      )}
    </>
  );
}
