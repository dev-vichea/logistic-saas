"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Route, ArrowRight, Truck, User, CheckCircle2, Clock } from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { transportRoot, type DispatchTrip, type TransportationCatalog } from "@/lib/transportation";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewTripDialog } from "./new-trip-dialog";
import { DispatchModal } from "./dispatch-modal";
import { PodModal } from "./pod-modal";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function TripList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");

  const catalogRes = useResource<{ data: TransportationCatalog }>(
    organization ? `${transportRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);

  const tripsRes = useResource<Paginated<DispatchTrip>>(
    organization ? `${transportRoot(organization.id)}/trips?${queryParams.toString()}` : null
  );

  const rawTrips = useMemo(
    () => tripsRes.data?.data || [],
    [tripsRes.data?.data]
  );

  const vehicleOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawTrips.forEach((t) => {
      if (t.vehicle) {
        map.set(String(t.vehicle.id), t.vehicle.plate_number);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawTrips]);

  const driverOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawTrips.forEach((t) => {
      if (t.driver) {
        map.set(String(t.driver.id), t.driver.full_name);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawTrips]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    vehicleFilter !== "all" ||
    driverFilter !== "all" ||
    dateFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setVehicleFilter("all");
    setDriverFilter("all");
    setDateFilter("all");
    setSearch("");
  };

  const trips = useMemo(() => {
    return rawTrips.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (vehicleFilter !== "all" && String(t.vehicle_id) !== vehicleFilter) return false;
      if (driverFilter !== "all" && String(t.driver_id) !== driverFilter) return false;
      if (dateFilter !== "all" && t.created_at) {
        const d = new Date(t.created_at);
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
  }, [rawTrips, statusFilter, vehicleFilter, driverFilter, dateFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_transit":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">In Transit</Badge>;
      case "dispatched":
        return <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200">Dispatched</Badge>;
      case "completed":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Completed & POD</Badge>;
      case "cancelled":
        return <Badge className="bg-red-50 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Draft Run-Sheet</Badge>;
    }
  };

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<DispatchTrip> | ColGroupDef<DispatchTrip>)[]>(() => {
    const allCols: (ColDef<DispatchTrip> | ColGroupDef<DispatchTrip>)[] = [
      {
        field: "trip_number",
        headerName: "Run-Sheet #",
        width: 155,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <Link
                href={`/transport/trips/${t.id}`}
                className="font-mono font-bold text-xs text-blue-950 hover:underline hover:text-blue-700 leading-none flex items-center gap-1.5"
              >
                <Route size={13} className="text-slate-400 shrink-0" />
                <span>{t.trip_number}</span>
              </Link>
            </div>
          );
        },
      },
      {
        headerName: "Assignments",
        headerClass: "ag-group-assignments",
        children: [
          {
            headerName: "Assigned Vehicle",
            width: 150,
            cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
              const t = params.data;
              if (!t) return null;
              if (!t.vehicle) return <span className="text-slate-400 text-xs italic">Unassigned</span>;
              return (
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                  <Truck size={12} className="text-slate-400 shrink-0" />
                  <span>{t.vehicle.plate_number}</span>
                </div>
              );
            },
          },
          {
            headerName: "Assigned Driver",
            width: 160,
            cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
              const t = params.data;
              if (!t) return null;
              if (!t.driver) return <span className="text-slate-400 text-xs italic">Unassigned</span>;
              return (
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                  <User size={12} className="text-slate-400 shrink-0" />
                  <span>{t.driver.full_name}</span>
                </div>
              );
            },
          },
          {
            field: "container_number",
            headerName: "Equipment / Trailer",
            width: 155,
            cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
              const t = params.data;
              if (!t) return null;
              return (
                <span className="text-xs text-slate-700 font-mono">
                  {t.container_number || t.trailer_vehicle?.plate_number || "Loose Cargo"}
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
            cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
              const t = params.data;
              if (!t) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {t.origin_location?.city || t.origin_location?.name || `Loc #${t.origin_location_id}`}
                </span>
              );
            },
          },
          {
            headerName: "Destination",
            width: 140,
            valueGetter: (params) => params.data?.destination_location?.city || params.data?.destination_location?.name || "",
            cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
              const t = params.data;
              if (!t) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {t.destination_location?.city || t.destination_location?.name || `Loc #${t.destination_location_id}`}
                </span>
              );
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Status",
        width: 145,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return <div className="flex items-center h-full">{getStatusBadge(t.status)}</div>;
        },
      },
      {
        headerName: "Actions",
        width: 175,
        pinned: "right",
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return (
            <div className="flex items-center justify-end gap-2 h-full">
              {t.status === "draft" && can("transport.manage") && (
                <DispatchModal trip={t} onDispatched={tripsRes.reload} />
              )}
              {t.status === "in_transit" && can("transport.manage") && (
                <PodModal trip={t} onDelivered={tripsRes.reload} />
              )}
              <Link
                href={`/transport/trips/${t.id}`}
                className="text-xs font-semibold text-blue-900 hover:underline inline-flex items-center gap-0.5"
              >
                Details <ArrowRight size={11} />
              </Link>
            </div>
          );
        },
      },
    ];

    if (activeView === "assignments") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Run-Sheet #", "Assignments", "Status", "Actions"].includes(name || "");
      });
    }
    if (activeView === "routing") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Run-Sheet #", "Routing", "Status", "Actions"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView, can, tripsRes]);

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (tripsRes.error) return <ErrorBox message={tripsRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;

  return (
    <>
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Dispatch Trips"
        icon={Route}
        tabs={[
          { id: "all", label: "All Trips", count: rawTrips.length },
          { id: "draft", label: "Draft", icon: Clock },
          { id: "in_transit", label: "In Transit", icon: Truck },
          { id: "completed", label: "Completed & POD", icon: CheckCircle2 },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search trip #, container, driver, plate..."
        primaryAction={
          can("transport.manage") ? (
            <NewTripDialog catalog={catalog} onCreated={tripsRes.reload} />
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
                  { value: "draft", label: "Draft Run-Sheet" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "completed", label: "Completed & POD" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                onChange={setStatusFilter}
                minWidth="min-w-[125px]"
              />
              {vehicleOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Vehicle"
                  value={vehicleFilter}
                  allLabel="All Vehicles"
                  options={vehicleOptions}
                  onChange={setVehicleFilter}
                  minWidth="min-w-[125px]"
                />
              )}
              {driverOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Driver"
                  value={driverFilter}
                  allLabel="All Drivers"
                  options={driverOptions}
                  onChange={setDriverFilter}
                  minWidth="min-w-[125px]"
                />
              )}
              <FloatingDateFilter
                label="Created"
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
                  { id: "default", label: "Default View", desc: "All columns & assignments" },
                  { id: "assignments", label: "Crew & Vehicle", desc: "Truck, driver & equipment" },
                  { id: "routing", label: "Routing & Status", desc: "Origin/dest & progress" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!tripsRes.data && !tripsRes.error ? (
        <Loading />
      ) : trips.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No dispatch run-sheets found"
            description={
              search || hasActiveFilters
                ? "No run-sheets match your current search or status filter."
                : "Create your first dispatch run-sheet to coordinate vehicles, drivers, and cargo legs."
            }
            action={can("transport.manage") ? <NewTripDialog catalog={catalog} onCreated={tripsRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<DispatchTrip>
            rowData={trips}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in run-sheets..."
          />
        </div>
      )}
    </>
  );
}
