"use client";

import { useState, useMemo } from "react";
import { Truck, CheckCircle2, Wrench } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { transportRoot, type Vehicle, type TransportationCatalog } from "@/lib/transportation";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewVehicleDialog } from "./new-vehicle-dialog";
import {
  WorkspaceHeaderSlot,
  FilterPill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function FleetList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");

  const catalogRes = useResource<{ data: TransportationCatalog }>(
    organization ? `${transportRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);

  const vehiclesRes = useResource<Paginated<Vehicle>>(
    organization ? `${transportRoot(organization.id)}/vehicles?${queryParams.toString()}` : null
  );

  const catalog = catalogRes.data?.data;
  const rawVehicles = vehiclesRes.data?.data || [];

  const vehicles = rawVehicles.filter((v) => {
    if (typeFilter !== "all" && v.type !== typeFilter) return false;
    if (ownershipFilter !== "all" && v.ownership_type !== ownershipFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Available</Badge>;
      case "dispatched":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">Dispatched</Badge>;
      case "maintenance":
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200">Maintenance</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Inactive</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "tractor_head":
        return <span className="text-xs font-medium text-slate-700">Tractor Head</span>;
      case "rigid_truck":
        return <span className="text-xs font-medium text-slate-700">Rigid Truck</span>;
      case "container_chassis":
        return <span className="text-xs font-medium text-slate-700">Chassis Trailer</span>;
      case "flatbed_trailer":
        return <span className="text-xs font-medium text-slate-700">Flatbed Trailer</span>;
      case "box_truck":
        return <span className="text-xs font-medium text-slate-700">Box Truck</span>;
      default:
        return <span className="text-xs font-medium text-slate-700">{type.replace(/_/g, " ")}</span>;
    }
  };

  const columnDefs = useMemo<ColDef<Vehicle>[]>(
    () => [
      {
        field: "plate_number",
        headerName: "Plate Number",
        minWidth: 170,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex items-center gap-2 h-full">
              <Truck size={13} className="text-slate-400 shrink-0" />
              <span className="font-mono font-bold text-slate-900 text-xs">{v.plate_number}</span>
            </div>
          );
        },
      },
      {
        field: "type",
        headerName: "Asset Type",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return <div className="flex items-center h-full">{getTypeLabel(v.type)}</div>;
        },
      },
      {
        field: "make_model",
        headerName: "Make & Model",
        minWidth: 180,
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex items-center h-full text-xs font-medium text-slate-800">
              <span>{v.make_model}</span>
              {v.year && <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({v.year})</span>}
            </div>
          );
        },
      },
      {
        field: "max_payload_kg",
        headerName: "Payload Capacity",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <span className="font-mono font-semibold text-slate-800 text-xs leading-none">
                {Number(v.max_payload_kg).toLocaleString()} kg
              </span>
              {v.volume_capacity_cbm && (
                <span className="text-[10px] text-slate-400 font-mono mt-1 leading-none">
                  {Number(v.volume_capacity_cbm)} CBM
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: "ownership_type",
        headerName: "Ownership",
        width: 140,
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex items-center h-full text-xs capitalize text-slate-600">
              {v.ownership_type}
            </div>
          );
        },
      },
      {
        field: "current_status",
        headerName: "Status",
        width: 140,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return <div className="flex items-center h-full">{getStatusBadge(v.current_status)}</div>;
        },
      },
    ],
    []
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (vehiclesRes.error) return <ErrorBox message={vehiclesRes.error} />;
  if (!catalogRes.data || !catalog) return <Loading />;

  return (
    <>
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Fleet Vehicles"
        icon={Truck}
        tabs={[
          { id: "all", label: "All Fleet", count: rawVehicles.length },
          { id: "available", label: "Available", icon: CheckCircle2 },
          { id: "dispatched", label: "Dispatched", icon: Truck },
          { id: "maintenance", label: "Maintenance", icon: Wrench },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search plate number, make, model..."
        primaryAction={
          can("transport.manage") ? (
            <NewVehicleDialog catalog={catalog} onCreated={vehiclesRes.reload} />
          ) : null
        }
        subHeader={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill
                label="Asset Type"
                value={typeFilter}
                options={[
                  { value: "all", label: "All Asset Types" },
                  { value: "tractor_head", label: "Tractor Head" },
                  { value: "rigid_truck", label: "Rigid Truck" },
                  { value: "container_chassis", label: "Container Chassis" },
                  { value: "flatbed_trailer", label: "Flatbed Trailer" },
                  { value: "box_truck", label: "Box Truck" },
                ]}
                onChange={setTypeFilter}
              />
              <FilterPill
                label="Ownership"
                value={ownershipFilter}
                options={[
                  { value: "all", label: "All Ownership" },
                  { value: "owned", label: "Company Owned" },
                  { value: "leased", label: "Leased" },
                  { value: "subcontracted", label: "Subcontracted" },
                ]}
                onChange={setOwnershipFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest registered" },
                  { value: "plate", label: "Plate number" },
                  { value: "payload", label: "Payload capacity" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!vehiclesRes.data && !vehiclesRes.error ? (
        <Loading />
      ) : vehicles.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No vehicles in fleet"
            description={
              search || statusFilter !== "all" || typeFilter !== "all"
                ? "No vehicles match your active search or filter selection."
                : "Register your first commercial truck or trailer to start managing dispatch run-sheets."
            }
            action={can("transport.manage") ? <NewVehicleDialog catalog={catalog} onCreated={vehiclesRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Vehicle>
            rowData={vehicles}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in fleet..."
          />
        </div>
      )}
    </>
  );
}
