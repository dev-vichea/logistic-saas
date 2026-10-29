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
import type { ColDef } from "ag-grid-community";
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
  FilterPill,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function ShipmentList() {
  const { organization, can } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [customsFilter, setCustomsFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");
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
        return <Ship size={14} className="text-blue-600" />;
      case "air":
        return <Plane size={14} className="text-sky-600" />;
      case "multimodal":
        return <Layers size={14} className="text-purple-600" />;
      default:
        return <Truck size={14} className="text-emerald-600" />;
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
        return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">At Transit Hub</Badge>;
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
        return <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs">Customs Cleared</Badge>;
      case "under_inspection":
        return <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">Under Inspection</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs">Docs Pending</Badge>;
    }
  };

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<Shipment>[]>(
    () => [
      {
        field: "shipment_number",
        headerName: "Shipment & Reference",
        minWidth: 190,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <Link
                href={`/freight/shipments/${s.id}`}
                className="text-xs font-bold text-blue-950 hover:underline hover:text-blue-700 leading-none"
              >
                {s.shipment_number}
              </Link>
              {s.master_tracking_number && (
                <span className="text-[10px] text-slate-400 font-mono leading-none mt-1">
                  B/L: {s.master_tracking_number}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: "customer.name",
        headerName: "Parties",
        minWidth: 200,
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 leading-none">
                <Building2 size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{s.customer?.name || `Customer #${s.customer_id}`}</span>
              </div>
              {s.carrier && (
                <div className="text-[10px] text-slate-400 mt-1 leading-none truncate">
                  Carrier: {s.carrier.name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Route",
        minWidth: 220,
        valueGetter: (params) => {
          const s = params.data;
          if (!s) return "";
          return `${s.origin_location?.name || s.origin_location_id} to ${s.destination_location?.name || s.destination_location_id}`;
        },
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-800 leading-none">
                <span className="truncate">{s.origin_location?.name || `Loc #${s.origin_location_id}`}</span>
                <ArrowRight size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{s.destination_location?.name || `Loc #${s.destination_location_id}`}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 leading-none">
                {s.origin_location?.country_code} &rarr; {s.destination_location?.country_code}
              </div>
            </div>
          );
        },
      },
      {
        field: "transport_mode",
        headerName: "Mode",
        width: 140,
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
      {
        field: "status",
        headerName: "Operational Status",
        width: 150,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return <div className="flex items-center h-full">{getStatusBadge(s.status)}</div>;
        },
      },
      {
        field: "customs_status",
        headerName: "Customs",
        width: 150,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Shipment>) => {
          const s = params.data;
          if (!s) return null;
          return <div className="flex items-center h-full">{getCustomsBadge(s.customs_status)}</div>;
        },
      },
      {
        field: "created_at",
        headerName: "Created",
        width: 120,
        valueFormatter: (params) => {
          if (!params.value) return "—";
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        headerName: "Action",
        width: 120,
        pinned: "right",
        sortable: false,
        filter: false,
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
    ],
    []
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;
  const rawShipments = shipmentsRes.data?.data || [];

  // Filter in-memory for mode and customs if selected
  const shipments = rawShipments
    .filter((s) => (modeFilter === "all" ? true : s.transport_mode === modeFilter))
    .filter((s) => (customsFilter === "all" ? true : s.customs_status === customsFilter));

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
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
              <FilterPill
                label="Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Movements" },
                  { value: "planned", label: "Planned" },
                  { value: "dispatched", label: "Dispatched" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "delivered", label: "Delivered" },
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
                  { value: "multimodal", label: "Multimodal" },
                ]}
                onChange={setModeFilter}
              />
              <FilterPill
                label="Customs"
                value={customsFilter}
                options={[
                  { value: "all", label: "All Compliance" },
                  { value: "cleared", label: "Customs Cleared" },
                  { value: "under_inspection", label: "Under Inspection" },
                  { value: "docs_pending", label: "Docs Pending" },
                ]}
                onChange={setCustomsFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest by origin" },
                  { value: "departure", label: "Scheduled departure" },
                  { value: "reference", label: "Reference number" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
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
              search || statusFilter !== "all"
                ? "Try adjusting your filters or search query."
                : "Register your first operational shipment to begin tracking cargo, multimodal legs, and milestones."
            }
            action={can("freight.manage") ? <NewShipmentDialog catalog={catalog} onCreated={shipmentsRes.reload} /> : null}
          />
        </div>
      ) : (
        /* Vektor-Grade Full-Screen AG Grid */
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
