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
} from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Shipment, type FreightCatalog } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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
    organization ? `${freightRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search.trim()) queryParams.set("q", search.trim());

  const shipmentsRes = useResource<Paginated<Shipment>>(
    organization ? `${freightRoot(organization.id)}/shipments?${queryParams.toString()}` : null
  );

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ocean_fcl":
      case "ocean_lcl":
        return <Ship size={13} className="text-blue-600" />;
      case "air":
        return <Plane size={13} className="text-sky-600" />;
      case "multimodal":
        return <Layers size={13} className="text-purple-600" />;
      default:
        return <Truck size={13} className="text-emerald-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "closed":
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Delivered</Badge>;
      case "in_transit":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">In Transit</Badge>;
      case "dispatched":
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Dispatched</Badge>;
      case "arrived_hub":
        return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">At Hub</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200">Planned</Badge>;
    }
  };

  const getCustomsBadge = (customsStatus: string) => {
    if (customsStatus === "not_applicable") return null;
    switch (customsStatus) {
      case "cleared":
      case "released":
        return <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs">Cleared</Badge>;
      case "under_inspection":
        return <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">Inspection</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs">Pending Docs</Badge>;
    }
  };

  const rawShipments = useMemo(
    () => shipmentsRes.data?.data || [],
    [shipmentsRes.data?.data]
  );

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

  // Filter in-memory for active filters
  const shipments = useMemo(() => {
    return rawShipments.filter((s) => {
      if (modeFilter !== "all" && s.transport_mode !== modeFilter) return false;
      if (customsFilter !== "all" && s.customs_status !== customsFilter) return false;
      if (customerFilter !== "all" && String(s.customer_id) !== customerFilter) return false;
      if (dateFilter !== "all" && s.created_at) {
        const d = new Date(s.created_at);
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
  }, [rawShipments, modeFilter, customsFilter, customerFilter, dateFilter]);

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<Shipment> | ColGroupDef<Shipment>)[]>(() => {
    const allCols: (ColDef<Shipment> | ColGroupDef<Shipment>)[] = [
      {
        field: "shipment_number",
        headerName: "Shipment ID",
        width: 155,
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
                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded leading-none truncate max-w-[70px]" title={s.master_tracking_number}>
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
                  <span className="truncate">{s.customer?.name || `Customer #${s.customer_id}`}</span>
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
              if (!s?.carrier?.name) return <span className="text-slate-400 text-xs">—</span>;
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
            width: 135,
            valueGetter: (params) => params.data?.origin_location?.city || params.data?.origin_location?.name || "",
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {s.origin_location?.city || s.origin_location?.name || `Loc #${s.origin_location_id}`}
                </span>
              );
            },
          },
          {
            headerName: "Destination",
            width: 135,
            valueGetter: (params) => params.data?.destination_location?.city || params.data?.destination_location?.name || "",
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {s.destination_location?.city || s.destination_location?.name || `Loc #${s.destination_location_id}`}
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
            headerName: "Customs Status",
            width: 130,
            floatingFilter: false,
            cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
              const s = params.data;
              if (!s) return null;
              return <div className="flex items-center h-full">{getCustomsBadge(s.customs_status)}</div>;
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Operational Status",
        width: 145,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return <div className="flex items-center h-full">{getStatusBadge(s.status)}</div>;
        },
      },
      {
        headerName: "Action",
        width: 110,
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-700 hover:underline"
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
        return ["Shipment ID", "Routing", "Service & Mode", "Schedule", "Operational Status", "Action"].includes(name || "");
      });
    }
    if (activeView === "compliance") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Shipment ID", "Parties", "Compliance", "Operational Status", "Action"].includes(name || "");
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
      {/* Vektor TMS Flexible Top Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Shipments"
        icon={Package}
        tabs={[
          { id: "all", label: "Default / All", count: rawShipments.length },
          { id: "planned", label: "Planning", icon: Package },
          { id: "dispatched", label: "Dispatched", icon: Truck },
          { id: "in_transit", label: "In Transit", icon: Ship },
          { id: "delivered", label: "Delivered" },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference, B/L, partner..."
        primaryAction={
          can("freight.manage") ? (
            <NewShipmentDialog catalog={catalog} onCreated={shipmentsRes.reload} />
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
                  { value: "planned", label: "Planned" },
                  { value: "dispatched", label: "Dispatched" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "delivered", label: "Delivered" },
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
                minWidth="min-w-[125px]"
              />
              {customerOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Customer"
                  value={customerFilter}
                  allLabel="All Customers"
                  options={customerOptions}
                  onChange={setCustomerFilter}
                  minWidth="min-w-[130px]"
                />
              )}
              <FloatingDateFilter
                label="Activity"
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
                  { id: "default", label: "Default View", desc: "All columns & tracking milestones" },
                  { id: "tracking", label: "Routing & Schedule", desc: "Origin/dest, ETD & ETA dates" },
                  { id: "compliance", label: "Parties & Customs", desc: "Customer, carrier & clearance" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!shipmentsRes.data && !shipmentsRes.error ? (
        <Loading />
      ) : shipments.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No shipments found"
            description={
              search || hasActiveFilters
                ? "No shipments match your current filter parameters."
                : "Active freight shipments across ocean, air, road and multimodal movements will appear here."
            }
            action={can("freight.manage") ? <NewShipmentDialog catalog={catalog} onCreated={shipmentsRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Shipment>
            rowData={shipments}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in shipments..."
          />
        </div>
      )}
    </>
  );
}
