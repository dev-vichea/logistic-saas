"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
} from "lucide-react";
import type { ColDef, ColGroupDef, RowDoubleClickedEvent } from "ag-grid-community";
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
import { QuotationStudioWorkspace } from "./quotation-studio-workspace";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function QuotationList() {
  const { organization, can } = useWorkspace();
  const searchParams = useSearchParams();
  const createFromId = searchParams.get("create_from");

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [validityFilter, setValidityFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Split-Screen Quotation Studio state
  const [studioOpen, setStudioOpen] = useState(() => Boolean(createFromId));
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [initialRequestId, setInitialRequestId] = useState<number | null>(() =>
    createFromId ? Number(createFromId) : null,
  );

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
  const rawQuotations = useMemo(
    () => quotationsRes.data?.data || [],
    [quotationsRes.data?.data]
  );

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawQuotations.forEach((q) => {
      if (q.customer) {
        map.set(String(q.customer.id), q.customer.name);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawQuotations]);

  const nextQuoteNumber = useMemo(() => {
    const year = new Date().getFullYear();
    let maxSeq = 0;
    for (const q of rawQuotations) {
      const match = q.quotation_number?.match(/QUO-(\d{4})-(\d+)/);
      if (match && Number(match[1]) === year) {
        const seq = Number(match[2]);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    return `QUO-${year}-${String(maxSeq + 1).padStart(4, "0")}`;
  }, [rawQuotations]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    modeFilter !== "all" ||
    customerFilter !== "all" ||
    validityFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setModeFilter("all");
    setCustomerFilter("all");
    setValidityFilter("all");
    setSearch("");
  };

  const quotations = useMemo(() => {
    return rawQuotations.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (modeFilter !== "all" && q.transport_mode !== modeFilter) return false;
      if (customerFilter !== "all" && String(q.customer_id) !== customerFilter) return false;
      if (validityFilter !== "all" && q.valid_until) {
        const d = new Date(q.valid_until);
        const now = new Date();
        if (validityFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (validityFilter === "this_week") {
          const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diff < -1 || diff > 7) return false;
        } else if (validityFilter === "this_month") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [rawQuotations, statusFilter, modeFilter, customerFilter, validityFilter]);

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

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<Quotation> | ColGroupDef<Quotation>)[]>(() => {
    const allCols: (ColDef<Quotation> | ColGroupDef<Quotation>)[] = [
      {
        field: "quotation_number",
        headerName: "Quote ID",
        width: 145,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <button
              type="button"
              onClick={() => {
                setSelectedQuotation(q);
                setInitialRequestId(null);
                setStudioOpen(true);
              }}
              className="flex items-center gap-1.5 h-full text-left group cursor-pointer"
              title="Open Live Quotation Studio & PDF"
            >
              <span className="font-semibold text-blue-950 group-hover:text-blue-700 group-hover:underline font-mono text-xs leading-none">
                {q.quotation_number}
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-medium bg-slate-100 px-1 py-0.5 rounded">
                R{q.revision}
              </span>
            </button>
          );
        },
      },
      {
        headerName: "Customer",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "customer.name",
            headerName: "Company Name",
            minWidth: 180,
            flex: 1.2,
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
        ],
      },
      {
        headerName: "Service Terms",
        headerClass: "ag-group-service",
        children: [
          {
            field: "transport_mode",
            headerName: "Mode",
            width: 120,
            cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
              const q = params.data;
              if (!q) return null;
              return (
                <span className="capitalize text-slate-800 font-medium text-xs leading-none">
                  {q.transport_mode.replace(/_/g, " ")}
                </span>
              );
            },
          },
          {
            field: "incoterm",
            headerName: "Incoterm",
            width: 105,
            cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
              const q = params.data;
              if (!q?.incoterm) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded">
                  {q.incoterm}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Routing",
        headerClass: "ag-group-origin",
        children: [
          {
            headerName: "Origin",
            width: 140,
            valueGetter: (params) => params.data?.origin_location?.city || params.data?.origin_location?.name || "",
            cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
              const q = params.data;
              if (!q) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {q.origin_location?.city || q.origin_location?.name || `Loc #${q.origin_location_id}`}
                </span>
              );
            },
          },
          {
            headerName: "Destination",
            width: 140,
            valueGetter: (params) => params.data?.destination_location?.city || params.data?.destination_location?.name || "",
            cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
              const q = params.data;
              if (!q) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {q.destination_location?.city || q.destination_location?.name || `Loc #${q.destination_location_id}`}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Commercials",
        headerClass: "ag-group-financial",
        children: [
          {
            field: "total_amount",
            headerName: "Total Amount",
            width: 150,
            cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
              const q = params.data;
              if (!q) return null;
              return (
                <div className="flex items-center h-full font-mono font-bold text-xs text-emerald-900">
                  {q.currency} {Number(q.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Schedule",
        headerClass: "ag-group-schedule",
        children: [
          {
            field: "valid_until",
            headerName: "Valid Until",
            width: 125,
            cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
              const q = params.data;
              if (!q?.valid_until) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="text-xs font-mono text-slate-600">
                  {new Date(q.valid_until).toLocaleDateString("en-GB")}
                </span>
              );
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Status",
        width: 135,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return <div className="flex items-center h-full">{getStatusBadge(q.status)}</div>;
        },
      },
      {
        headerName: "Actions",
        width: 175,
        pinned: "right",
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Quotation>) => {
          const q = params.data;
          if (!q) return null;
          return (
            <div className="flex items-center justify-end gap-1.5 h-full">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedQuotation(q);
                  setInitialRequestId(null);
                  setStudioOpen(true);
                }}
                className="h-6 text-[11px] px-1.5 text-blue-900 hover:text-blue-700 hover:bg-blue-50 font-medium flex items-center gap-1"
                title="Open Live Quotation Studio & View A4 PDF"
              >
                <FileText size={12} className="text-blue-600" />
                <span>PDF</span>
              </Button>
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
    ];

    if (activeView === "commercial") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Quote ID", "Customer", "Service Terms", "Commercials", "Status", "Actions"].includes(name || "");
      });
    }
    if (activeView === "routing") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Quote ID", "Routing", "Service Terms", "Schedule", "Status", "Actions"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView, can, updatingId, handleStatusUpdate]);

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
            <Button
              onClick={() => {
                setSelectedQuotation(null);
                setInitialRequestId(null);
                setStudioOpen(true);
              }}
              className="h-8 gap-1.5 px-3 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs shadow-2xs"
            >
              <Plus size={14} />
              <span>Create Quotation</span>
            </Button>
          ) : null
        }
        subHeader={
          <>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingFilterSelect
                label="Status"
                value={statusFilter}
                allLabel="All Statuses"
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Sent to Client" },
                  { value: "accepted", label: "Accepted" },
                  { value: "rejected", label: "Rejected" },
                  { value: "expired", label: "Expired" },
                ]}
                onChange={setStatusFilter}
                minWidth="min-w-[115px]"
              />
              <FloatingFilterSelect
                label="Mode"
                value={modeFilter}
                allLabel="All Modes"
                options={[
                  { value: "ocean_fcl", label: "Ocean FCL" },
                  { value: "ocean_lcl", label: "Ocean LCL" },
                  { value: "air", label: "Air Cargo" },
                  { value: "road", label: "Road Freight" },
                  { value: "multimodal", label: "Multimodal" },
                ]}
                onChange={setModeFilter}
                minWidth="min-w-[115px]"
              />
              {customerOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Client"
                  value={customerFilter}
                  allLabel="All Clients"
                  options={customerOptions}
                  onChange={setCustomerFilter}
                  minWidth="min-w-[130px]"
                />
              )}
              <FloatingDateFilter
                label="Validity"
                value={validityFilter}
                options={[
                  { value: "all", label: "All Dates" },
                  { value: "today", label: "Expiring Today" },
                  { value: "this_week", label: "Expiring This Week" },
                  { value: "this_month", label: "This Month" },
                ]}
                onChange={setValidityFilter}
              />
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ViewPresetSelector
                activeView={activeView}
                presets={[
                  { id: "default", label: "Default View", desc: "All columns & commercial details" },
                  { id: "commercial", label: "Commercial Focus", desc: "Customer, terms, pricing & actions" },
                  { id: "routing", label: "Routing & Validity", desc: "Route origin/dest & schedule" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
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
              search || hasActiveFilters
                ? "No quotations match your current filters or search query."
                : "Quotations generated for customer freight inquiries will appear here with full revision history."
            }
            action={
              can("freight.manage") ? (
                <Button
                  onClick={() => {
                    setSelectedQuotation(null);
                    setInitialRequestId(null);
                    setStudioOpen(true);
                  }}
                  className="gap-2 bg-blue-900 hover:bg-blue-800 text-white text-xs shadow-2xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Create Quotation</span>
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Quotation>
            rowData={quotations}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in quotations..."
            onRowDoubleClicked={(e: RowDoubleClickedEvent<Quotation>) => {
              if (e.data) {
                setSelectedQuotation(e.data);
                setInitialRequestId(null);
                setStudioOpen(true);
              }
            }}
          />
        </div>
      )}

      {/* Split-Screen Interactive Quotation Studio with Realtime A4 PDF Sheet */}
      <QuotationStudioWorkspace
        key={
          selectedQuotation?.id
            ? `quote-${selectedQuotation.id}`
            : initialRequestId
            ? `req-${initialRequestId}`
            : "new-quote"
        }
        open={studioOpen}
        onOpenChange={setStudioOpen}
        catalog={catalog}
        existingQuotation={selectedQuotation}
        initialRequestId={initialRequestId}
        defaultQuoteNumber={nextQuoteNumber}
        onSaved={quotationsRes.reload}
      />
    </>
  );
}
