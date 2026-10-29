"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Route, ArrowRight, Truck, User, CheckCircle2, Clock } from "lucide-react";
import type { ColDef } from "ag-grid-community";
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
  FilterPill,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function TripList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");

  const catalogRes = useResource<{ data: TransportationCatalog }>(
    organization ? `${transportRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);

  const tripsRes = useResource<Paginated<DispatchTrip>>(
    organization ? `${transportRoot(organization.id)}/trips?${queryParams.toString()}` : null
  );

  const catalog = catalogRes.data?.data;
  const rawTrips = tripsRes.data?.data || [];

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

  const columnDefs = useMemo<ColDef<DispatchTrip>[]>(
    () => [
      {
        field: "trip_number",
        headerName: "Run-Sheet #",
        minWidth: 180,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <Link
                href={`/transport/trips/${t.id}`}
                className="font-mono font-bold text-xs text-blue-950 hover:underline hover:text-blue-700 leading-none flex items-center gap-1.5"
              >
                <Route size={13} className="text-slate-400 shrink-0" />
                <span>{t.trip_number}</span>
              </Link>
              {t.trip_legs_count !== undefined && (
                <span className="text-[10px] font-mono text-slate-400 mt-1 leading-none">
                  {t.trip_legs_count} assigned {t.trip_legs_count === 1 ? "leg" : "legs"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Vehicle & Driver",
        minWidth: 200,
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs leading-none">
                <Truck size={12} className="text-slate-400 shrink-0" />
                <span>{t.vehicle ? t.vehicle.plate_number : "Unassigned Truck"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 leading-none">
                <User size={11} className="text-slate-400 shrink-0" />
                <span>{t.driver ? t.driver.full_name : "Unassigned Driver"}</span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "Route",
        minWidth: 220,
        valueGetter: (params) => {
          const t = params.data;
          if (!t) return "";
          return `${t.origin_location?.name || t.origin_location?.city || t.origin_location_id} to ${t.destination_location?.name || t.destination_location?.city || t.destination_location_id}`;
        },
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return (
            <div className="flex items-center gap-1 h-full text-xs text-slate-700">
              <span className="truncate font-medium">{t.origin_location?.city || t.origin_location?.name || `Loc #${t.origin_location_id}`}</span>
              <ArrowRight size={11} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{t.destination_location?.city || t.destination_location?.name || `Loc #${t.destination_location_id}`}</span>
            </div>
          );
        },
      },
      {
        field: "container_number",
        headerName: "Equipment / Container",
        width: 170,
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return (
            <div className="flex items-center h-full text-xs text-slate-700 font-mono">
              {t.container_number || t.trailer_vehicle?.plate_number || "Loose Cargo"}
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<DispatchTrip>) => {
          const t = params.data;
          if (!t) return null;
          return <div className="flex items-center h-full">{getStatusBadge(t.status)}</div>;
        },
      },
      {
        headerName: "Actions",
        width: 180,
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
    ],
    [can, tripsRes]
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (tripsRes.error) return <ErrorBox message={tripsRes.error} />;
  if (!catalogRes.data || !catalog) return <Loading />;

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
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
              <FilterPill
                label="Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "draft", label: "Draft Run-Sheet" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "completed", label: "Completed & POD" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest created" },
                  { value: "trip_number", label: "Trip number" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!tripsRes.data && !tripsRes.error ? (
        <Loading />
      ) : rawTrips.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No dispatch run-sheets found"
            description={
              search || statusFilter !== "all"
                ? "No run-sheets match your current search or status filter."
                : "Create your first dispatch run-sheet to coordinate vehicles, drivers, and cargo legs."
            }
            action={can("transport.manage") ? <NewTripDialog catalog={catalog} onCreated={tripsRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<DispatchTrip>
            rowData={rawTrips}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in run-sheets..."
          />
        </div>
      )}
    </>
  );
}
