"use client";

import { useState, useMemo } from "react";
import { UsersRound, Phone, CheckCircle2, Clock } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { transportRoot, type Driver, type TransportationCatalog } from "@/lib/transportation";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewDriverDialog } from "./new-driver-dialog";
import {
  WorkspaceHeaderSlot,
  FilterPill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function DriverList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [licenseFilter, setLicenseFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");

  const catalogRes = useResource<{ data: TransportationCatalog }>(
    organization ? `${transportRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);

  const driversRes = useResource<Paginated<Driver>>(
    organization ? `${transportRoot(organization.id)}/drivers?${queryParams.toString()}` : null
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Available</Badge>;
      case "on_trip":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">On Trip</Badge>;
      case "rest_leave":
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200">On Leave</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Inactive</Badge>;
    }
  };

  const getLicenseLabel = (type: string) => {
    switch (type) {
      case "articulated_trailer":
        return <span className="text-xs font-medium text-slate-700">Class E (Trailer)</span>;
      case "heavy_truck":
        return <span className="text-xs font-medium text-slate-700">Class C (Heavy)</span>;
      case "hazardous_materials":
        return <span className="text-xs font-medium text-slate-700">Hazmat</span>;
      default:
        return <span className="text-xs font-medium text-slate-700">Class B (Light)</span>;
    }
  };

  const columnDefs = useMemo<ColDef<Driver>[]>(
    () => [
      {
        field: "full_name",
        headerName: "Driver Name",
        minWidth: 190,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs leading-none">
                <UsersRound size={13} className="text-slate-400 shrink-0" />
                <span>{d.full_name}</span>
              </div>
              {d.email && (
                <span className="text-[10px] text-slate-400 font-mono mt-1 leading-none">
                  {d.email}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: "phone",
        headerName: "Contact Phone",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center gap-1.5 h-full text-xs font-mono text-slate-700">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span>{d.phone}</span>
            </div>
          );
        },
      },
      {
        field: "license_number",
        headerName: "License #",
        width: 170,
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <span className="font-mono font-semibold text-slate-900 text-xs uppercase leading-none">
                {d.license_number}
              </span>
              {d.license_expires_at && (
                <span className="text-[10px] text-slate-400 font-mono mt-1 leading-none">
                  Exp: {new Date(d.license_expires_at).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: "license_type",
        headerName: "License Class",
        width: 170,
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return <div className="flex items-center h-full">{getLicenseLabel(d.license_type)}</div>;
        },
      },
      {
        field: "current_status",
        headerName: "Status",
        width: 140,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return <div className="flex items-center h-full">{getStatusBadge(d.current_status)}</div>;
        },
      },
    ],
    []
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (driversRes.error) return <ErrorBox message={driversRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;
  const rawDrivers = driversRes.data?.data || [];

  const drivers = rawDrivers.filter((d) => {
    if (licenseFilter !== "all" && d.license_type !== licenseFilter) return false;
    return true;
  });

  return (
    <>
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Drivers & Crew"
        icon={UsersRound}
        tabs={[
          { id: "all", label: "All Drivers", count: rawDrivers.length },
          { id: "available", label: "Available", icon: CheckCircle2 },
          { id: "on_trip", label: "On Trip" },
          { id: "rest_leave", label: "On Leave", icon: Clock },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search driver name, phone, license..."
        primaryAction={
          can("transport.manage") ? (
            <NewDriverDialog catalog={catalog} onCreated={driversRes.reload} />
          ) : null
        }
        subHeader={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill
                label="License"
                value={licenseFilter}
                options={[
                  { value: "all", label: "All Classes" },
                  { value: "articulated_trailer", label: "Class E (Trailer)" },
                  { value: "heavy_truck", label: "Class C (Heavy)" },
                  { value: "hazardous_materials", label: "Hazmat" },
                ]}
                onChange={setLicenseFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest registered" },
                  { value: "name", label: "Driver name" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!driversRes.data && !driversRes.error ? (
        <Loading />
      ) : drivers.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No drivers registered"
            description={
              search || statusFilter !== "all" || licenseFilter !== "all"
                ? "No drivers match your active query."
                : "Register your professional drivers to dispatch them on road transport run-sheets."
            }
            action={can("transport.manage") ? <NewDriverDialog catalog={catalog} onCreated={driversRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Driver>
            rowData={drivers}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in drivers..."
          />
        </div>
      )}
    </>
  );
}
