"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  Ship,
  Plane,
  Layers,
  ArrowRight,
  Building2,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
} from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Shipment, type FreightCatalog } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewShipmentDialog } from "./new-shipment-dialog";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function ShipmentList() {
  const { organization, can } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [customsFilter, setCustomsFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");
  const [search, setSearch] = useState<string>("");

  const catalogRes = useResource<{ data: FreightCatalog }>(
    organization ? `${freightRoot(organization.id)}/catalog` : null,
  );

  const queryParams = new URLSearchParams();
  queryParams.set("per_page", "100");
  if (search.trim()) queryParams.set("q", search.trim());

  const shipmentsRes = useResource<Paginated<Shipment>>(
    organization
      ? `${freightRoot(organization.id)}/shipments?${queryParams.toString()}`
      : null,
  );

  const rawShipments = useMemo(
    () => shipmentsRes.data?.data || [],
    [shipmentsRes.data?.data],
  );

  // Dynamic tab counts calculation across all shipments
  const tabCounts = useMemo(() => {
    return {
      all: rawShipments.length,
      planned: rawShipments.filter(
        (s) => s.status === "draft" || s.status === "planned",
      ).length,
      dispatched: rawShipments.filter((s) => s.status === "dispatched").length,
      in_transit: rawShipments.filter(
        (s) => s.status === "in_transit" || s.status === "arrived_hub",
      ).length,
      delivered: rawShipments.filter(
        (s) => s.status === "delivered" || s.status === "closed",
      ).length,
    };
  }, [rawShipments]);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ocean_fcl":
      case "ocean_lcl":
        return <Ship size={13} className="text-blue-600 shrink-0" />;
      case "air":
        return <Plane size={13} className="text-sky-600 shrink-0" />;
      case "multimodal":
        return <Layers size={13} className="text-purple-600 shrink-0" />;
      default:
        return <Truck size={13} className="text-emerald-600 shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "closed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Delivered
          </span>
        );
      case "in_transit":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-blue-600" />
            </span>
            In Transit
          </span>
        );
      case "arrived_hub":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
            <span className="size-1.5 rounded-full bg-indigo-600" />
            At Hub
          </span>
        );
      case "dispatched":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-600" />
            Dispatched
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            <span className="size-1.5 rounded-full bg-red-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            <span className="size-1.5 rounded-full bg-slate-500" />
            Planning
          </span>
        );
    }
  };

  const getCustomsBadge = (customsStatus: string) => {
    if (!customsStatus || customsStatus === "not_applicable") {
      return <span className="text-xs text-slate-400 font-mono">Domestic</span>;
    }
    switch (customsStatus) {
      case "cleared":
      case "released":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
            <CheckCircle2 size={11} className="text-emerald-600" /> Cleared
          </span>
        );
      case "under_inspection":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            <AlertTriangle size={11} className="text-amber-600" /> Inspection
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            <Clock size={11} className="text-slate-400" /> Docs Pending
          </span>
        );
    }
  };

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawShipments.forEach((s) => {
      if (s.customer) {
        map.set(String(s.customer.id), s.customer.name);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawShipments]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    modeFilter !== "all" ||
    customsFilter !== "all" ||
    customerFilter !== "all" ||
    dateFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setModeFilter("all");
    setCustomsFilter("all");
    setCustomerFilter("all");
    setDateFilter("all");
    setSearch("");
  };

  // Comprehensive in-memory multi-attribute filtering
  const shipments = useMemo(() => {
    return rawShipments.filter((s) => {
      // 1. Status Tab filter
      if (statusFilter === "planned") {
        if (s.status !== "draft" && s.status !== "planned") return false;
      } else if (statusFilter === "dispatched") {
        if (s.status !== "dispatched") return false;
      } else if (statusFilter === "in_transit") {
        if (s.status !== "in_transit" && s.status !== "arrived_hub") return false;
      } else if (statusFilter === "delivered") {
        if (s.status !== "delivered" && s.status !== "closed") return false;
      } else if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }

      // 2. Transport mode filter
      if (modeFilter !== "all" && s.transport_mode !== modeFilter) return false;

      // 3. Customs compliance filter
      if (customsFilter !== "all" && s.customs_status !== customsFilter)
        return false;

      // 4. Customer partner filter
      if (customerFilter !== "all" && String(s.customer_id) !== customerFilter)
        return false;

      // 5. Date filter
      if (dateFilter !== "all" && s.created_at) {
        const d = new Date(s.created_at);
        const now = new Date();
        if (dateFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this_week") {
          const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diff < -1 || diff > 7) return false;
        } else if (dateFilter === "this_month") {
          if (
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        }
      }

      // 6. Text search query filter (in addition to backend search)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchNumber = s.shipment_number?.toLowerCase().includes(q);
        const matchTracking = s.master_tracking_number?.toLowerCase().includes(q);
        const matchCustomer = s.customer?.name?.toLowerCase().includes(q);
        const matchCarrier = s.carrier?.name?.toLowerCase().includes(q);
        const matchOrigin = s.origin_location?.name?.toLowerCase().includes(q) ||
          s.origin_location?.city?.toLowerCase().includes(q);
        const matchDest = s.destination_location?.name?.toLowerCase().includes(q) ||
          s.destination_location?.city?.toLowerCase().includes(q);
        if (
          !matchNumber &&
          !matchTracking &&
          !matchCustomer &&
          !matchCarrier &&
          !matchOrigin &&
          !matchDest
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    rawShipments,
    statusFilter,
    modeFilter,
    customsFilter,
    customerFilter,
    dateFilter,
    search,
  ]);

  // AG Grid Column Definitions with ShipFlow Tinted Group Headers
  const columnDefs = useMemo<(ColDef<Shipment> | ColGroupDef<Shipment>)[]>(() => {
    const allCols: (ColDef<Shipment> | ColGroupDef<Shipment>)[] = [
      {
        field: "shipment_number",
        headerName: "Shipment ID",
        width: 175,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <Link
                href={`/freight/shipments/${s.id}`}
                className="text-xs font-bold text-blue-950 hover:underline hover:text-blue-700 leading-none font-mono"
              >
                {s.shipment_number}
              </Link>
              {s.master_tracking_number && (
                <span
                  className="text-[10px] text-slate-600 font-mono bg-slate-100 border border-slate-200/60 px-1 py-0.5 rounded leading-none truncate max-w-[80px]"
                  title={s.master_tracking_number}
                >
                  {s.master_tracking_number}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Parties",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "customer.name",
            headerName: "Customer / Shipper",
            minWidth: 175,
            flex: 1.2,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-medium text-slate-800">
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {s.customer?.name || `Customer #${s.customer_id}`}
                  </span>
                </div>
              );
            },
          },
          {
            field: "carrier.name",
            headerName: "Carrier Partner",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s?.carrier?.name)
                return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {s.carrier.name}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Service & Mode",
        headerClass: "ag-group-service",
        children: [
          {
            field: "transport_mode",
            headerName: "Transport Mode",
            width: 130,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs capitalize text-slate-700">
                  {getModeIcon(s.transport_mode)}
                  <span>{s.transport_mode.replace(/_/g, " ")}</span>
                </div>
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
            valueGetter: (params) =>
              params.data?.origin_location?.city ||
              params.data?.origin_location?.name ||
              "",
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {s.origin_location?.city ||
                    s.origin_location?.name ||
                    `Loc #${s.origin_location_id}`}
                </span>
              );
            },
          },
          {
            headerName: "Destination",
            width: 140,
            valueGetter: (params) =>
              params.data?.destination_location?.city ||
              params.data?.destination_location?.name ||
              "",
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {s.destination_location?.city ||
                    s.destination_location?.name ||
                    `Loc #${s.destination_location_id}`}
                </span>
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
            field: "etd",
            headerName: "Est. Departure",
            width: 120,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s?.etd) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="text-xs font-mono text-slate-600">
                  {new Date(s.etd).toLocaleDateString("en-GB")}
                </span>
              );
            },
          },
          {
            field: "eta",
            headerName: "Est. Arrival",
            width: 120,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s?.eta) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="text-xs font-mono text-slate-600">
                  {new Date(s.eta).toLocaleDateString("en-GB")}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Compliance",
        headerClass: "ag-group-compliance",
        children: [
          {
            field: "customs_status",
            headerName: "Customs SAD",
            width: 135,
            floatingFilter: false,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <div className="flex items-center h-full">
                  {getCustomsBadge(s.customs_status)}
                </div>
              );
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Operational Status",
        width: 150,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return (
            <div className="flex items-center h-full">
              {getStatusBadge(s.status)}
            </div>
          );
        },
      },
      {
        headerName: "Action",
        width: 115,
        pinned: "right",
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return (
            <div className="flex items-center justify-end h-full">
              <Link
                href={`/freight/shipments/${s.id}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-900 bg-blue-50/60 hover:bg-blue-100 hover:text-blue-950 transition-colors"
              >
                Timeline <ArrowRight size={11} />
              </Link>
            </div>
          );
        },
      },
    ];

    if (activeView === "tracking") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return [
          "Shipment ID",
          "Routing",
          "Service & Mode",
          "Schedule",
          "Operational Status",
          "Action",
        ].includes(name || "");
      });
    }
    if (activeView === "compliance") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return [
          "Shipment ID",
          "Parties",
          "Compliance",
          "Operational Status",
          "Action",
        ].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (shipmentsRes.error) return <ErrorBox message={shipmentsRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;

  return (
    <>
      {/* ShipFlow Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Shipments"
        icon={Package}
        tabs={[
          { id: "all", label: "All Shipments", count: tabCounts.all },
          { id: "planned", label: "Planning", icon: Package, count: tabCounts.planned },
          { id: "dispatched", label: "Dispatched", icon: Truck, count: tabCounts.dispatched },
          { id: "in_transit", label: "In Transit", icon: Ship, count: tabCounts.in_transit },
          { id: "delivered", label: "Delivered", count: tabCounts.delivered },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference, B/L, partner, port..."
        primaryAction={
          can("freight.manage") ? (
            <NewShipmentDialog
              catalog={catalog}
              onCreated={shipmentsRes.reload}
            />
          ) : null
        }
        subHeader={
          <>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingFilterSelect
                label="Status"
                value={statusFilter}
                allLabel="All Movements"
                options={[
                  { value: "planned", label: "Planned / Draft" },
                  { value: "dispatched", label: "Dispatched" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "delivered", label: "Delivered" },
                ]}
                onChange={setStatusFilter}
                minWidth="min-w-[125px]"
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
                minWidth="min-w-[120px]"
              />
              <FloatingFilterSelect
                label="Customs"
                value={customsFilter}
                allLabel="All Compliance"
                options={[
                  { value: "cleared", label: "Customs Cleared" },
                  { value: "under_inspection", label: "Under Inspection" },
                  { value: "pending_docs", label: "Docs Pending" },
                ]}
                onChange={setCustomsFilter}
                minWidth="min-w-[130px]"
              />
              {customerOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Customer"
                  value={customerFilter}
                  allLabel="All Customers"
                  options={customerOptions}
                  onChange={setCustomerFilter}
                  minWidth="min-w-[140px]"
                />
              )}
              <FloatingDateFilter
                label="Date Range"
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
                  {
                    id: "default",
                    label: "Default View",
                    desc: "All columns & tracking milestones",
                  },
                  {
                    id: "tracking",
                    label: "Routing & Schedule",
                    desc: "Origin/dest, ETD & ETA dates",
                  },
                  {
                    id: "compliance",
                    label: "Parties & Customs",
                    desc: "Customer, carrier & clearance",
                  },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => shipmentsRes.reload()}
                className="h-8 size-8 p-0 border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Refresh shipment list"
              >
                <RotateCcw size={13} />
              </Button>
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed Enterprise AG Grid Table */}
      {!shipmentsRes.data && !shipmentsRes.error ? (
        <Loading />
      ) : shipments.length === 0 ? (
        <div className="p-8">
          <Empty
            title={
              hasActiveFilters
                ? "No matching shipments found"
                : "No freight shipments in this workspace"
            }
            description={
              hasActiveFilters
                ? "No shipments match your current filter parameters. Try clearing your filters or search query."
                : "Create your first shipment or load carrier booking details to begin tracking live movements across road, sea and air."
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAllFilters}
                  className="gap-1.5"
                >
                  <RotateCcw size={13} /> Clear all filters
                </Button>
              ) : can("freight.manage") ? (
                <NewShipmentDialog
                  catalog={catalog}
                  onCreated={shipmentsRes.reload}
                />
              ) : null
            }
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Shipment>
            rowData={shipments}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search reference, B/L, partner..."
            enableSelection={true}
            enableExport={true}
            enableColumnPicker={true}
            enableDensityToggle={true}
          />
        </div>
      )}
    </>
  );
}
