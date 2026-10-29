"use client";

import { useState, useMemo } from "react";
import {
  BookmarkCheck,
  Building2,
  ArrowRight,
  Truck,
  CheckCircle2,
} from "lucide-react";
import type { ColDef } from "ag-grid-community";
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
  FilterPill,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function BookingList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");

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
  const rawBookings = bookingsRes.data?.data || [];

  const bookings = rawBookings.filter((b) =>
    modeFilter === "all" ? true : b.transport_mode === modeFilter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Confirmed</Badge>;
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

  const columnDefs = useMemo<ColDef<Booking>[]>(
    () => [
      {
        field: "booking_number",
        headerName: "Booking Reference",
        minWidth: 190,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <span className="font-semibold text-slate-900 font-mono text-xs leading-none">{b.booking_number}</span>
              {b.customer_reference && (
                <span className="text-[10px] font-mono text-slate-400 mt-1 leading-none">
                  Ref: {b.customer_reference}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: "customer.name",
        headerName: "Customer",
        minWidth: 200,
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
      {
        field: "transport_mode",
        headerName: "Transport Mode",
        width: 150,
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return (
            <div className="flex items-center h-full">
              <span className="capitalize text-xs font-medium text-slate-700">
                {b.transport_mode.replace(/_/g, " ")}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Route",
        minWidth: 220,
        valueGetter: (params) => {
          const b = params.data;
          if (!b) return "";
          return `${b.origin_location?.name || b.origin_location?.city || b.origin_location_id} to ${b.destination_location?.name || b.destination_location?.city || b.destination_location_id}`;
        },
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return (
            <div className="flex items-center gap-1 h-full text-xs text-slate-700">
              <span className="truncate font-medium">{b.origin_location?.city || b.origin_location?.name || `Loc #${b.origin_location_id}`}</span>
              <ArrowRight size={11} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{b.destination_location?.city || b.destination_location?.name || `Loc #${b.destination_location_id}`}</span>
            </div>
          );
        },
      },
      {
        headerName: "Cargo / Shipments",
        minWidth: 180,
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return (
            <div className="flex items-center h-full text-xs text-slate-500 font-mono">
              {b.cargo_items_count || 0} commodities · {b.shipments_count || 0} shipments
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 140,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return <div className="flex items-center h-full">{getStatusBadge(b.status)}</div>;
        },
      },
      {
        field: "total_amount",
        headerName: "Agreed Value",
        width: 150,
        pinned: "right",
        cellRenderer: (params: CustomCellRendererProps<Booking>) => {
          const b = params.data;
          if (!b) return null;
          return (
            <div className="flex items-center justify-end h-full font-mono font-bold text-xs text-slate-900">
              {b.total_amount ? `${b.currency} ${Number(b.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
            </div>
          );
        },
      },
    ],
    []
  );

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
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
              <FilterPill
                label="Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "in_transit", label: "In Transit" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
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
                ]}
                onChange={setModeFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest booking" },
                  { value: "number", label: "Booking number" },
                  { value: "amount", label: "Agreed value" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
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
            title="No bookings recorded"
            description={
              search || statusFilter !== "all"
                ? "No bookings match your current filters or search query."
                : "Commercial bookings converted from accepted quotations or direct requests will appear here."
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
