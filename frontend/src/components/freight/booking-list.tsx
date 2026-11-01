"use client";

import { useState, useMemo } from "react";
import {
  BookmarkCheck,
  Building2,
  Truck,
  CheckCircle2,
} from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Booking, type FreightCatalog } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewBookingDialog } from "./new-booking-dialog";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function BookingList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");

  const catalogRes = useResource<{ data: FreightCatalog }>(
    organization ? `${freightRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const bookingsRes = useResource<Paginated<Booking>>(
    organization ? `${freightRoot(organization.id)}/bookings?${queryParams.toString()}` : null
  );

  const catalog = catalogRes.data?.data;
  const rawBookings = useMemo(
    () => bookingsRes.data?.data || [],
    [bookingsRes.data?.data]
  );

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawBookings.forEach((b) => {
      if (b.customer) {
        map.set(String(b.customer.id), b.customer.name);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawBookings]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    modeFilter !== "all" ||
    customerFilter !== "all" ||
    dateFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setStatusFilter("all");
    setModeFilter("all");
    setCustomerFilter("all");
    setDateFilter("all");
    setSearch("");
  };

  const bookings = useMemo(() => {
    return rawBookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (modeFilter !== "all" && b.transport_mode !== modeFilter) return false;
      if (customerFilter !== "all" && String(b.customer_id) !== customerFilter) return false;
      if (dateFilter !== "all" && b.created_at) {
        const d = new Date(b.created_at);
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
  }, [rawBookings, statusFilter, modeFilter, customerFilter, dateFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Confirmed</Badge>;
      case "in_progress":
      case "in_transit":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">In Transit</Badge>;
      case "completed":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-50 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700 capitalize">{status}</Badge>;
    }
  };

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<Booking> | ColGroupDef<Booking>)[]>(() => {
    const allCols: (ColDef<Booking> | ColGroupDef<Booking>)[] = [
      {
        field: "booking_number",
        headerName: "Booking Ref",
        width: 155,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <span className="font-semibold text-slate-900 font-mono text-xs leading-none">{b.booking_number}</span>
              {b.customer_reference && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded leading-none truncate max-w-[70px]" title={b.customer_reference}>
                  {b.customer_reference}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Customer",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "customer.name",
            headerName: "Company Name",
            minWidth: 180,
            flex: 1.2,
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs font-medium text-slate-800">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{b.customer?.name || `Customer #${b.customer_id}`}</span>
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
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b) return null;
              return (
                <span className="capitalize text-slate-800 font-medium text-xs leading-none">
                  {b.transport_mode.replace(/_/g, " ")}
                </span>
              );
            },
          },
          {
            field: "incoterm",
            headerName: "Incoterm",
            width: 105,
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b?.incoterm) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded">
                  {b.incoterm}
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
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {b.origin_location?.city || b.origin_location?.name || `Loc #${b.origin_location_id}`}
                </span>
              );
            },
          },
          {
            headerName: "Destination",
            width: 140,
            valueGetter: (params) => params.data?.destination_location?.city || params.data?.destination_location?.name || "",
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b) return null;
              return (
                <span className="text-xs text-slate-700 truncate font-medium">
                  {b.destination_location?.city || b.destination_location?.name || `Loc #${b.destination_location_id}`}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Cargo & Ops",
        headerClass: "ag-group-cargo",
        children: [
          {
            headerName: "Cargo Items",
            width: 110,
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b) return null;
              return (
                <span className="font-mono text-xs text-slate-700">
                  {b.cargo_items_count || 0} items
                </span>
              );
            },
          },
          {
            headerName: "Shipments",
            width: 110,
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b) return null;
              return (
                <span className="font-mono text-xs text-slate-700">
                  {b.shipments_count || 0} moves
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Commercials",
        headerClass: "ag-group-financial",
        children: [
          {
            field: "total_amount",
            headerName: "Agreed Rate",
            width: 145,
            cellRenderer: (params: CustomCellRendererProps<Booking>) => {
              const b = params.data;
              if (!b?.total_amount) return <span className="text-slate-400 text-xs">—</span>;
              return (
                <div className="flex items-center h-full font-mono font-bold text-xs text-emerald-900">
                  {b.currency} {Number(b.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              );
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Status",
        width: 135,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return <div className="flex items-center h-full">{getStatusBadge(b.status)}</div>;
        },
      },
    ];

    if (activeView === "commercial") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Booking Ref", "Customer", "Service Terms", "Commercials", "Status"].includes(name || "");
      });
    }
    if (activeView === "operations") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Booking Ref", "Routing", "Service Terms", "Cargo & Ops", "Status"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (bookingsRes.error) return <ErrorBox message={bookingsRes.error} />;
  if (!catalogRes.data || !catalog) return <Loading />;

  return (
    <>
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Bookings"
        icon={BookmarkCheck}
        tabs={[
          { id: "all", label: "All Orders", count: rawBookings.length },
          { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
          { id: "in_transit", label: "In Transit", icon: Truck },
          { id: "completed", label: "Completed" },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search booking number, PO, customer..."
        primaryAction={
          can("freight.manage") ? (
            <NewBookingDialog catalog={catalog} onCreated={bookingsRes.reload} />
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
                  { value: "confirmed", label: "Confirmed" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "completed", label: "Completed" },
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
                  { id: "default", label: "Default View", desc: "All columns & operations" },
                  { id: "commercial", label: "Commercial Focus", desc: "Customer, terms & agreed rate" },
                  { id: "operations", label: "Routing & Ops", desc: "Route origin/dest & cargo items" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
            </div>
          </>
        }
      />

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!bookingsRes.data && !bookingsRes.error ? (
        <Loading />
      ) : bookings.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No bookings found"
            description={
              search || hasActiveFilters
                ? "No confirmed bookings match your current filter parameters."
                : "Confirmed customer bookings will appear here for movement execution and shipment dispatch."
            }
            action={can("freight.manage") ? <NewBookingDialog catalog={catalog} onCreated={bookingsRes.reload} /> : null}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<Booking>
            rowData={bookings}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in bookings..."
          />
        </div>
      )}
    </>
  );
}
