"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  Ship,
  Plane,
  Layers,
  Building2,
  Calendar,
  MapPin,
  Thermometer,
  ArrowRight,
} from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type FreightRequest, type FreightCatalog } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewRequestDialog } from "./new-request-dialog";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function FreightRequestList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [incotermFilter, setIncotermFilter] = useState<string>("all");
  const [shipperFilter, setShipperFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");
  const [segment, setSegment] = useState<string>("inbound");

  const catalogRes = useResource<{ data: FreightCatalog }>(
    organization ? `${freightRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const requestsRes = useResource<Paginated<FreightRequest>>(
    organization ? `${freightRoot(organization.id)}/requests?${queryParams.toString()}` : null
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "quoted":
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200">Quoted</Badge>;
      case "reviewing":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-800 border-blue-200">Reviewing</Badge>;
      case "converted":
        return <Badge variant="secondary" className="bg-purple-50 text-purple-800 border-purple-200">Booked</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-red-50 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Submitted</Badge>;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ocean_fcl":
      case "ocean_lcl":
        return <Ship size={13} className="text-blue-600 shrink-0" />;
      case "air":
        return <Plane size={13} className="text-sky-600 shrink-0" />;
      case "multimodal":
        return <Layers size={13} className="text-indigo-600 shrink-0" />;
      default:
        return <Truck size={13} className="text-emerald-600 shrink-0" />;
    }
  };

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<FreightRequest> | ColGroupDef<FreightRequest>)[]>(() => {
    const allCols: (ColDef<FreightRequest> | ColGroupDef<FreightRequest>)[] = [
      {
        field: "request_number",
        headerName: "Req ID",
        width: 130,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
          const r = params.data;
          if (!r) return null;
          return (
            <div className="flex items-center h-full">
              <span className="font-semibold text-slate-900 font-mono text-xs">
                {r.request_number}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Shipper",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "customer.name",
            headerName: "Company Name",
            minWidth: 175,
            flex: 1.2,
            valueGetter: (params) => params.data?.customer?.name || "",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const r = params.data;
              if (!r) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-semibold text-slate-900 truncate">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{r.customer?.name || `Customer #${r.customer_id}`}</span>
                </div>
              );
            },
          },
          {
            field: "customer.code",
            headerName: "Code",
            width: 95,
            valueGetter: (params) => params.data?.customer?.code || "—",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const code = params.data?.customer?.code;
              return (
                <div className="flex items-center h-full font-mono text-xs text-slate-500">
                  {code || "—"}
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
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const r = params.data;
              if (!r) return null;
              return (
                <div className="flex items-center gap-1.5 h-full capitalize text-slate-700 text-xs font-medium">
                  {getModeIcon(r.transport_mode)}
                  <span>{r.transport_mode.replace(/_/g, " ")}</span>
                </div>
              );
            },
          },
          {
            field: "incoterm",
            headerName: "Incoterm",
            width: 90,
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const r = params.data;
              return (
                <div className="flex items-center h-full font-mono text-xs font-semibold text-slate-700">
                  {r?.incoterm || "STD"}
                </div>
              );
            },
          },
          {
            field: "package_type",
            headerName: "Load Type",
            width: 115,
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const r = params.data;
              if (!r) return null;
              const pkg = r.package_type ? r.package_type.replace(/_/g, " ") : "Standard";
              return (
                <div className="flex items-center gap-1.5 h-full">
                  <span className="capitalize font-medium text-xs text-slate-700 truncate">
                    {pkg}
                  </span>
                  {r.is_dangerous && (
                    <span className="size-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-bold" title="Dangerous Goods / Hazardous">
                      DG
                    </span>
                  )}
                  {r.is_temperature_controlled && (
                    <span className="size-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[9px] font-bold" title="Temperature Controlled / Reefer">
                      <Thermometer size={10} />
                    </span>
                  )}
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Origin Routing",
        headerClass: "ag-group-origin",
        children: [
          {
            headerName: "City, Country",
            width: 140,
            valueGetter: (params) => {
              const loc = params.data?.origin_location;
              return loc?.city ? `${loc.city}, ${loc.country_code}` : loc?.name || "—";
            },
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const loc = params.data?.origin_location;
              if (!loc) return <span className="text-slate-400 font-mono text-xs flex items-center h-full">—</span>;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-semibold text-slate-900 truncate">
                  <MapPin size={11} className="text-blue-600 shrink-0" />
                  <span className="truncate">{loc.city ? `${loc.city}, ${loc.country_code}` : loc.name}</span>
                </div>
              );
            },
          },
          {
            headerName: "Facility / Hub",
            minWidth: 145,
            flex: 1,
            valueGetter: (params) => params.data?.origin_location?.name || "—",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const name = params.data?.origin_location?.name;
              return (
                <div className="flex items-center h-full text-xs text-slate-600 truncate">
                  <span className="truncate">{name || "Origin Hub"}</span>
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Destination Routing",
        headerClass: "ag-group-destination",
        children: [
          {
            headerName: "City, Country",
            width: 140,
            valueGetter: (params) => {
              const loc = params.data?.destination_location;
              return loc?.city ? `${loc.city}, ${loc.country_code}` : loc?.name || "—";
            },
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const loc = params.data?.destination_location;
              if (!loc) return <span className="text-slate-400 font-mono text-xs flex items-center h-full">—</span>;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-semibold text-slate-900 truncate">
                  <MapPin size={11} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{loc.city ? `${loc.city}, ${loc.country_code}` : loc.name}</span>
                </div>
              );
            },
          },
          {
            headerName: "Port / Terminal",
            minWidth: 145,
            flex: 1,
            valueGetter: (params) => params.data?.destination_location?.name || "—",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const name = params.data?.destination_location?.name;
              return (
                <div className="flex items-center h-full text-xs text-slate-600 truncate">
                  <span className="truncate">{name || "Destination Port"}</span>
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Cargo Specifications",
        headerClass: "ag-group-cargo",
        children: [
          {
            field: "cargo_description",
            headerName: "Description",
            minWidth: 180,
            flex: 1.3,
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const desc = params.data?.cargo_description;
              return (
                <div className="flex items-center h-full text-xs font-medium text-slate-900 truncate">
                  <span className="truncate">{desc || "General Cargo"}</span>
                </div>
              );
            },
          },
          {
            field: "total_pieces",
            headerName: "Pieces",
            width: 85,
            type: "rightAligned",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const pcs = params.data?.total_pieces;
              return (
                <div className="flex items-center justify-end h-full font-mono text-xs text-slate-700">
                  {pcs ? `${pcs} pcs` : "—"}
                </div>
              );
            },
          },
          {
            field: "total_weight_kg",
            headerName: "Gross Wt",
            width: 105,
            type: "rightAligned",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const wt = params.data?.total_weight_kg;
              return (
                <div className="flex items-center justify-end h-full font-mono text-xs font-medium text-slate-800">
                  {wt ? `${Number(wt).toLocaleString()} kg` : "—"}
                </div>
              );
            },
          },
          {
            field: "total_volume_cbm",
            headerName: "Volume",
            width: 95,
            type: "rightAligned",
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const vol = params.data?.total_volume_cbm;
              return (
                <div className="flex items-center justify-end h-full font-mono text-xs text-slate-700">
                  {vol ? `${Number(vol).toFixed(1)} CBM` : "—"}
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Dates & Schedule",
        headerClass: "ag-group-schedule",
        children: [
          {
            field: "created_at",
            headerName: "Intake Date",
            width: 110,
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const date = params.data?.created_at;
              if (!date) return null;
              return (
                <div className="flex items-center h-full text-xs font-mono text-slate-600">
                  {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              );
            },
          },
          {
            field: "target_readiness_date",
            headerName: "Cargo Readiness",
            width: 125,
            cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
              const val = params.data?.target_readiness_date;
              if (!val) return <span className="text-slate-400 font-mono text-xs flex items-center h-full">—</span>;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-mono text-slate-800 font-medium">
                  <Calendar size={12} className="text-slate-400 shrink-0" />
                  <span>
                    {new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              );
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Status",
        width: 105,
        pinned: "right",
        cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
          const r = params.data;
          return r ? <div className="flex items-center h-full">{getStatusBadge(r.status)}</div> : null;
        },
      },
      {
        headerName: "Actions",
        width: 85,
        pinned: "right",
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: CustomCellRendererProps<FreightRequest>) => {
          const r = params.data;
          if (!r) return null;
          return (
            <div className="flex items-center justify-end h-full">
              <Link
                href={`/freight/quotations?create_from=${r.id}`}
                className="text-xs font-semibold text-blue-900 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Quote</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          );
        },
      },
    ];

    if (activeView === "commercial") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Req ID", "Shipper", "Service Terms", "Dates & Schedule", "Status", "Actions"].includes(name || "");
      });
    }
    if (activeView === "routing") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Req ID", "Origin Routing", "Destination Routing", "Cargo Specifications", "Dates & Schedule", "Status", "Actions"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

  const rawRequests = useMemo(
    () => requestsRes.data?.data || [],
    [requestsRes.data?.data]
  );

  const shipperOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawRequests.forEach((r) => {
      if (r.customer) {
        map.set(String(r.customer.id), r.customer.name);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawRequests]);

  const originOptions = useMemo(() => {
    const locs = catalogRes.data?.data?.locations;
    if (!locs) return [];
    const originLocs = locs.filter(
      (l) => l.type === "factory" || l.type === "dry_port" || l.type === "warehouse"
    );
    const uniqueCities = Array.from(new Set(originLocs.map((l) => l.city).filter(Boolean)));
    return uniqueCities.map((city) => ({
      value: city,
      label: city,
    }));
  }, [catalogRes.data?.data?.locations]);

  const incotermOptions = [
    { value: "FCA", label: "FCA (Free Carrier)" },
    { value: "FOB", label: "FOB (Free on Board)" },
    { value: "CIF", label: "CIF (Cost, Insurance & Freight)" },
    { value: "CIP", label: "CIP (Carriage & Insurance Paid)" },
    { value: "DDP", label: "DDP (Delivered Duty Paid)" },
    { value: "EXW", label: "EXW (Ex Works)" },
    { value: "DAP", label: "DAP (Delivered at Place)" },
    { value: "CFR", label: "CFR (Cost & Freight)" },
  ];

  const hasActiveFilters =
    statusFilter !== "all" ||
    modeFilter !== "all" ||
    incotermFilter !== "all" ||
    shipperFilter !== "all" ||
    originFilter !== "all" ||
    dateFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setModeFilter("all");
    setIncotermFilter("all");
    setShipperFilter("all");
    setOriginFilter("all");
    setDateFilter("all");
    setSearch("");
  };

  const requests = useMemo(() => {
    return rawRequests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (modeFilter !== "all" && r.transport_mode !== modeFilter) return false;
      if (incotermFilter !== "all" && r.incoterm !== incotermFilter) return false;
      if (shipperFilter !== "all" && String(r.customer_id) !== shipperFilter) return false;
      if (originFilter !== "all") {
        const originCity = r.origin_location?.city?.toLowerCase() || "";
        if (!originCity.includes(originFilter.toLowerCase())) return false;
      }
      if (dateFilter !== "all" && r.target_readiness_date) {
        const d = new Date(r.target_readiness_date);
        const now = new Date();
        if (dateFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this_week") {
          const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diff < -2 || diff > 7) return false;
        } else if (dateFilter === "this_month") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [rawRequests, statusFilter, modeFilter, incotermFilter, shipperFilter, originFilter, dateFilter]);

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;

  return (
    <>
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Freight Requests"
        icon={Inbox}
        segmentPills={[
          { id: "inbound", label: "Inbound", icon: ArrowDownLeft },
          { id: "outbound", label: "Outbound", icon: ArrowUpRight },
        ]}
        activeSegment={segment}
        onSegmentChange={setSegment}
        tabs={[
          { id: "all", label: "All Requests", count: rawRequests.length },
          { id: "submitted", label: "Submitted" },
          { id: "reviewing", label: "Reviewing" },
          { id: "quoted", label: "Quoted" },
          { id: "converted", label: "Booked" },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search request #, cargo, client..."
        primaryAction={
          can("freight.manage") ? (
            <NewRequestDialog catalog={catalog} onCreated={requestsRes.reload} />
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
                  { value: "submitted", label: "Submitted" },
                  { value: "reviewing", label: "Reviewing" },
                  { value: "quoted", label: "Quoted" },
                  { value: "converted", label: "Booked" },
                  { value: "cancelled", label: "Cancelled" },
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
                label="Incoterm"
                value={incotermFilter}
                allLabel="All Terms"
                options={incotermOptions}
                onChange={setIncotermFilter}
                minWidth="min-w-[110px]"
              />
              {shipperOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Shipper"
                  value={shipperFilter}
                  allLabel="All Shippers"
                  options={shipperOptions}
                  onChange={setShipperFilter}
                  minWidth="min-w-[130px]"
                />
              )}
              {originOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Origin"
                  value={originFilter}
                  allLabel="All Origins"
                  options={originOptions}
                  onChange={setOriginFilter}
                  minWidth="min-w-[115px]"
                />
              )}
              <FloatingDateFilter
                label="Readiness"
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
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
            </div>
          </>
        }
      />

      {requests.length === 0 ? (
        <div className="p-8">
          <Empty
            title="No Freight Requests Found"
            description="Inbound customer freight inquiries will appear here for quote preparation."
            action={can("freight.manage") ? <NewRequestDialog catalog={catalog} onCreated={requestsRes.reload} /> : null}
          />
        </div>
      ) : (
        <MekongDataGrid<FreightRequest>
          rowData={requests}
          columnDefs={columnDefs}
          title="Customer Inquiries & RFQs"
          quickFilterPlaceholder="Quick search in requests..."
        />
      )}
    </>
  );
}
