"use client";

import { useState, useMemo } from "react";
import { UsersRound, Phone, CheckCircle2, Clock } from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
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
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function DriverList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [licenseFilter, setLicenseFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");

  const catalogRes = useResource<{ data: TransportationCatalog }>(
    organization ? `${transportRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);

  const driversRes = useResource<Paginated<Driver>>(
    organization ? `${transportRoot(organization.id)}/drivers?${queryParams.toString()}` : null
  );

  const rawDrivers = useMemo(
    () => driversRes.data?.data || [],
    [driversRes.data?.data]
  );

  const hasActiveFilters =
    statusFilter !== "all" ||
    licenseFilter !== "all" ||
    expiryFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setLicenseFilter("all");
    setExpiryFilter("all");
    setSearch("");
  };

  const drivers = useMemo(() => {
    return rawDrivers.filter((d) => {
      if (statusFilter !== "all" && d.current_status !== statusFilter) return false;
      if (licenseFilter !== "all" && d.license_type !== licenseFilter) return false;
      if (expiryFilter !== "all" && d.license_expires_at) {
        const expDate = new Date(d.license_expires_at);
        const today = new Date();
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (expiryFilter === "expired" && diffDays >= 0) return false;
        if (expiryFilter === "30_days" && (diffDays < 0 || diffDays > 30)) return false;
        if (expiryFilter === "90_days" && (diffDays < 0 || diffDays > 90)) return false;
      }
      return true;
    });
  }, [rawDrivers, statusFilter, licenseFilter, expiryFilter]);

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

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<Driver> | ColGroupDef<Driver>)[]>(() => {
    const allCols: (ColDef<Driver> | ColGroupDef<Driver>)[] = [
      {
        field: "full_name",
        headerName: "Driver Name",
        width: 175,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
              <UsersRound size={13} className="text-slate-400 shrink-0" />
              <span>{d.full_name}</span>
            </div>
          );
        },
      },
      {
        headerName: "Contact & Comms",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "phone",
            headerName: "Phone Number",
            width: 150,
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
            field: "email",
            headerName: "Email Address",
            minWidth: 175,
            flex: 1.2,
            cellRenderer: (params: CustomCellRendererProps<Driver>) => {
              const d = params.data;
              if (!d?.email) return <span className="text-slate-400 text-xs">—</span>;
              return <span className="text-xs font-mono text-slate-600 truncate">{d.email}</span>;
            },
          },
        ],
      },
      {
        headerName: "Licensing & Credentials",
        headerClass: "ag-group-service",
        children: [
          {
            field: "license_type",
            headerName: "License Class",
            width: 145,
            cellRenderer: (params: CustomCellRendererProps<Driver>) => {
              const d = params.data;
              if (!d) return null;
              return <div className="flex items-center h-full">{getLicenseLabel(d.license_type)}</div>;
            },
          },
          {
            field: "license_number",
            headerName: "License #",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<Driver>) => {
              const d = params.data;
              if (!d) return null;
              return (
                <span className="font-mono font-semibold text-slate-900 text-xs uppercase">
                  {d.license_number}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Validity & Expiration",
        headerClass: "ag-group-schedule",
        children: [
          {
            field: "license_expires_at",
            headerName: "License Expiry",
            width: 130,
            cellRenderer: (params: CustomCellRendererProps<Driver>) => {
              const d = params.data;
              if (!d?.license_expires_at) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="text-xs font-mono text-slate-600">
                  {new Date(d.license_expires_at).toLocaleDateString("en-GB")}
                </span>
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
        cellRenderer: (params: CustomCellRendererProps<Driver>) => {
          const d = params.data;
          if (!d) return null;
          return <div className="flex items-center h-full">{getStatusBadge(d.current_status)}</div>;
        },
      },
    ];

    if (activeView === "licensing") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Driver Name", "Licensing & Credentials", "Validity & Expiration", "Status"].includes(name || "");
      });
    }
    if (activeView === "contact") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Driver Name", "Contact & Comms", "Status"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (driversRes.error) return <ErrorBox message={driversRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;

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
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingFilterSelect
                label="Status"
                value={statusFilter}
                allLabel="All Statuses"
                options={[
                  { value: "available", label: "Available" },
                  { value: "on_trip", label: "On Trip" },
                  { value: "rest_leave", label: "On Leave" },
                  { value: "inactive", label: "Inactive" },
                ]}
                onChange={setStatusFilter}
                minWidth="min-w-[115px]"
              />
              <FloatingFilterSelect
                label="License"
                value={licenseFilter}
                allLabel="All Classes"
                options={[
                  { value: "articulated_trailer", label: "Class E (Trailer)" },
                  { value: "heavy_truck", label: "Class C (Heavy)" },
                  { value: "hazardous_materials", label: "Hazmat" },
                ]}
                onChange={setLicenseFilter}
                minWidth="min-w-[130px]"
              />
              <FloatingDateFilter
                label="Expiry"
                value={expiryFilter}
                options={[
                  { value: "all", label: "All Validity" },
                  { value: "30_days", label: "Within 30 Days" },
                  { value: "90_days", label: "Within 90 Days" },
                  { value: "expired", label: "Expired" },
                ]}
                onChange={setExpiryFilter}
              />
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ViewPresetSelector
                activeView={activeView}
                presets={[
                  { id: "default", label: "Default View", desc: "All columns & credentials" },
                  { id: "licensing", label: "Licensing & Expiration", desc: "Class, license # & expiry" },
                  { id: "contact", label: "Crew Contact", desc: "Phone, email & status" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
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
              search || hasActiveFilters
                ? "No drivers match your active query or filters."
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
