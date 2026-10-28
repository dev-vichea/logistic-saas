"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Truck,
  Ship,
  Plane,
  Layers,
  ArrowRight,
  Building2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { PageHeading, NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Shipment, type FreightCatalog } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NewShipmentDialog } from "./new-shipment-dialog";

export function ShipmentList() {
  const { organization, can } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const catalogRes = useResource<{ data: FreightCatalog }>(
    organization ? `${freightRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search.trim()) queryParams.set("q", search.trim());

  const shipmentsRes = useResource<Paginated<Shipment>>(
    organization ? `${freightRoot(organization.id)}/shipments?${queryParams.toString()}` : null
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const catalog = catalogRes.data.data;
  const shipments = shipmentsRes.data?.data || [];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ocean_fcl":
      case "ocean_lcl":
        return <Ship size={15} className="text-blue-600" />;
      case "air":
        return <Plane size={15} className="text-sky-600" />;
      case "multimodal":
        return <Layers size={15} className="text-purple-600" />;
      default:
        return <Truck size={15} className="text-emerald-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "closed":
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Delivered</Badge>;
      case "in_transit":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">In Transit</Badge>;
      case "dispatched":
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Dispatched</Badge>;
      case "arrived_hub":
        return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">At Transit Hub</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200">Planned</Badge>;
    }
  };

  const getCustomsBadge = (customsStatus: string) => {
    if (customsStatus === "not_applicable") return null;
    switch (customsStatus) {
      case "cleared":
      case "released":
        return <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs">Customs Cleared</Badge>;
      case "under_inspection":
        return <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">Under Inspection</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs">Docs Pending</Badge>;
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="Freight Operations"
        title="Shipments & Multimodal Tracking"
        description="Monitor multimodal cargo movements, transit legs, milestones, and cross-company participants."
        action={can("freight.manage") ? <NewShipmentDialog catalog={catalog} onCreated={shipmentsRes.reload} /> : null}
      />

      {/* Filter Tabs & Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 w-full sm:w-auto">
          {[
            { id: "all", label: "All Movements" },
            { id: "planned", label: "Planned" },
            { id: "dispatched", label: "Dispatched" },
            { id: "in_transit", label: "In Transit" },
            { id: "delivered", label: "Delivered" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === tab.id
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference, B/L, partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {!shipmentsRes.data && !shipmentsRes.error ? (
        <Loading />
      ) : shipments.length === 0 ? (
        <Empty
          title="No shipments found"
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your filters or search query."
              : "Register your first operational shipment to begin tracking cargo, multimodal legs, and milestones."
          }
          action={can("freight.manage") ? <NewShipmentDialog catalog={catalog} onCreated={shipmentsRes.reload} /> : null}
        />
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Shipment & Reference</th>
                  <th className="px-4 py-3.5">Parties</th>
                  <th className="px-4 py-3.5">Route</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5">Operational Status</th>
                  <th className="px-4 py-3.5">Customs</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <Link
                        href={`/freight/shipments/${s.id}`}
                        className="font-semibold text-primary hover:underline flex items-center gap-1.5"
                      >
                        {s.shipment_number}
                      </Link>
                      {s.master_tracking_number && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          B/L: {s.master_tracking_number}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 size={14} className="text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{s.customer?.name || "—"}</span>
                      </div>
                      {s.carrier && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">
                          Carrier: {s.carrier.name}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-foreground">
                          {s.origin_location?.city || s.origin_location?.name || "Origin"}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {s.destination_location?.city || s.destination_location?.name || "Destination"}
                        </span>
                      </div>
                      {(s.origin_location?.country_code || s.destination_location?.country_code) && (
                        <span className="text-[11px] text-muted-foreground mt-0.5 block">
                          {s.origin_location?.country_code} → {s.destination_location?.country_code}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {getModeIcon(s.transport_mode)}
                        <span className="capitalize text-xs font-medium text-slate-700">
                          {s.transport_mode.replace("_", " ")}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">{getStatusBadge(s.status)}</td>

                    <td className="px-4 py-4">{getCustomsBadge(s.customs_status) || <span className="text-xs text-muted-foreground">—</span>}</td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/freight/shipments/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                      >
                        View Timeline
                        <ArrowRight size={13} />
                      </Link>
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
