"use client";

import { useState, useMemo } from "react";
import { Truck, CheckCircle2, Wrench, Building2 } from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
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
  FloatingFilterSelect,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function FleetList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [makeFilter, setMakeFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");

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
  const rawVehicles = useMemo(
    () => vehiclesRes.data?.data || [],
    [vehiclesRes.data?.data]
  );

  const makeOptions = useMemo(() => {
    const uniqueMakes = Array.from(new Set(rawVehicles.map((v) => v.make_model).filter(Boolean)));
    return uniqueMakes.map((m) => ({
      value: m,
      label: m,
    }));
  }, [rawVehicles]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    ownershipFilter !== "all" ||
    makeFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setOwnershipFilter("all");
    setMakeFilter("all");
    setSearch("");
  };

  const vehicles = useMemo(() => {
    return rawVehicles.filter((v) => {
      if (statusFilter !== "all" && v.current_status !== statusFilter) return false;
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (ownershipFilter !== "all" && v.ownership_type !== ownershipFilter) return false;
      if (makeFilter !== "all" && v.make_model !== makeFilter) return false;
      return true;
    });
  }, [rawVehicles, statusFilter, typeFilter, ownershipFilter, makeFilter]);

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

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<Vehicle> | ColGroupDef<Vehicle>)[]>(() => {
    const allCols: (ColDef<Vehicle> | ColGroupDef<Vehicle>)[] = [
      {
        field: "plate_number",
        headerName: "Plate Number",
        width: 155,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <Truck size={13} className="text-slate-400 shrink-0" />
              <span className="font-mono font-bold text-slate-900 text-xs">{v.plate_number}</span>
            </div>
          );
        },
      },
      {
        headerName: "Vehicle Specifications",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "type",
            headerName: "Asset Type",
            width: 150,
            cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
              const v = params.data;
              if (!v) return null;
              return <div className="flex items-center h-full">{getTypeLabel(v.type)}</div>;
            },
          },
          {
            field: "make_model",
            headerName: "Make & Model",
            minWidth: 175,
            flex: 1.2,
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
            field: "year",
            headerName: "Year",
            width: 95,
            cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
              const v = params.data;
              if (!v?.year) return <span className="text-slate-400 text-xs">—</span>;
              return <span className="font-mono text-xs text-slate-600">{v.year}</span>;
            },
          },
        ],
      },
      {
        headerName: "Capacity & Payload",
        headerClass: "ag-group-cargo",
        children: [
          {
            field: "max_payload_kg",
            headerName: "Max Payload",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
              const v = params.data;
              if (!v) return null;
              return (
                <span className="font-mono font-semibold text-slate-800 text-xs">
                  {Number(v.max_payload_kg).toLocaleString()} kg
                </span>
              );
            },
          },
          {
            field: "volume_capacity_cbm",
            headerName: "Volume",
            width: 115,
            cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
              const v = params.data;
              if (!v?.volume_capacity_cbm) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="text-xs text-slate-600 font-mono">
                  {Number(v.volume_capacity_cbm)} CBM
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Ownership & Carrier",
        headerClass: "ag-group-service",
        children: [
          {
            field: "ownership_type",
            headerName: "Ownership",
            width: 130,
            cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
              const v = params.data;
              if (!v) return null;
              return (
                <span className="text-xs capitalize font-medium text-slate-700 bg-slate-100/70 px-1.5 py-0.5 rounded">
                  {v.ownership_type}
                </span>
              );
            },
          },
          {
            field: "carrier_partner.name",
            headerName: "Carrier Partner",
            width: 160,
            cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
              const v = params.data;
              if (!v?.carrier_partner?.name) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{v.carrier_partner.name}</span>
                </div>
              );
            },
          },
        ],
      },
      {
        field: "current_status",
        headerName: "Status",
        width: 135,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Vehicle>) => {
          const v = params.data;
          if (!v) return null;
          return <div className="flex items-center h-full">{getStatusBadge(v.current_status)}</div>;
        },
      },
    ];

    if (activeView === "specs") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Plate Number", "Vehicle Specifications", "Capacity & Payload", "Status"].includes(name || "");
      });
    }
    if (activeView === "ownership") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Plate Number", "Vehicle Specifications", "Ownership & Carrier", "Status"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

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
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingFilterSelect
                label="Status"
                value={statusFilter}
                allLabel="All Statuses"
                options={[
                  { value: "available", label: "Available" },
                  { value: "dispatched", label: "Dispatched" },
                  { value: "maintenance", label: "Maintenance" },
                  { value: "inactive", label: "Inactive" },
                ]}
                onChange={setStatusFilter}
                minWidth="min-w-[115px]"
              />
              <FloatingFilterSelect
                label="Asset Type"
                value={typeFilter}
                allLabel="All Types"
                options={[
                  { value: "tractor_head", label: "Tractor Head" },
                  { value: "rigid_truck", label: "Rigid Truck" },
                  { value: "container_chassis", label: "Chassis Trailer" },
                  { value: "flatbed_trailer", label: "Flatbed Trailer" },
                  { value: "box_truck", label: "Box Truck" },
                ]}
                onChange={setTypeFilter}
                minWidth="min-w-[125px]"
              />
              <FloatingFilterSelect
                label="Ownership"
                value={ownershipFilter}
                allLabel="All Ownership"
                options={[
                  { value: "owned", label: "Company Owned" },
                  { value: "leased", label: "Leased" },
                  { value: "subcontracted", label: "Subcontracted" },
                ]}
                onChange={setOwnershipFilter}
                minWidth="min-w-[125px]"
              />
              {makeOptions.length > 0 && (
                <FloatingFilterSelect
                  label="Make"
                  value={makeFilter}
                  allLabel="All Makes"
                  options={makeOptions}
                  onChange={setMakeFilter}
                  minWidth="min-w-[120px]"
                />
              )}
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ViewPresetSelector
                activeView={activeView}
                presets={[
                  { id: "default", label: "Default View", desc: "All columns & fleet assets" },
                  { id: "specs", label: "Specs & Capacity", desc: "Type, model, payload & volume" },
                  { id: "ownership", label: "Ownership & Partner", desc: "Owned/leased & carrier partners" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
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
              search || hasActiveFilters
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
