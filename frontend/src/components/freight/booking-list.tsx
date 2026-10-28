"use client";

import { useState } from "react";
import {
  Search,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { PageHeading, NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Booking } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function BookingList() {
  const { organization } = useWorkspace();
  const [search, setSearch] = useState<string>("");

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());

  const bookingsRes = useResource<Paginated<Booking>>(
    organization ? `${freightRoot(organization.id)}/bookings?${queryParams.toString()}` : null
  );

  if (!organization) return <NoOrganization />;
  if (bookingsRes.error) return <ErrorBox message={bookingsRes.error} />;

  const bookings = bookingsRes.data?.data || [];

  return (
    <div>
      <PageHeading
        eyebrow="Commercial Orders"
        title="Orders & Freight Bookings"
        description="Confirmed customer orders, commercial freight agreements, and service commitments."
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search booking number, PO, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {!bookingsRes.data && !bookingsRes.error ? (
        <Loading />
      ) : bookings.length === 0 ? (
        <Empty
          title="No bookings recorded"
          description={
            search
              ? "No bookings match your query."
              : "Commercial bookings converted from accepted quotations or direct requests will appear here."
          }
        />
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Booking Reference</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Transport Mode</th>
                  <th className="px-4 py-3.5">Route</th>
                  <th className="px-4 py-3.5">Cargo / Shipments</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Agreed Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-foreground block">{b.booking_number}</span>
                      {b.customer_reference && (
                        <span className="text-xs font-mono text-muted-foreground block mt-0.5">
                          Ref: {b.customer_reference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 size={14} className="text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{b.customer?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="capitalize text-xs font-medium bg-slate-100 px-2 py-1 rounded">
                        {b.transport_mode.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <span>{b.origin_location?.city || b.origin_location?.name || "Origin"}</span>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <span>{b.destination_location?.city || b.destination_location?.name || "Destination"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-muted-foreground">
                        {b.cargo_items_count || 0} commodities · {b.shipments_count || 0} shipments
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-medium text-foreground">
                      {b.total_amount ? `${b.currency} ${Number(b.total_amount).toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
