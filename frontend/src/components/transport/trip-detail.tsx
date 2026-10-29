"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Truck,
  User,
  Route,
  Package,
  Gauge,
  FileCheck,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { transportRoot, type DispatchTrip } from "@/lib/transportation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { DispatchModal } from "./dispatch-modal";
import { PodModal } from "./pod-modal";

export function TripDetail({ tripId }: { tripId: number }) {
  const { organization, can } = useWorkspace();
  const [cancelling, setCancelling] = useState(false);

  const tripRes = useResource<{ data: DispatchTrip }>(
    organization ? `${transportRoot(organization.id)}/trips/${tripId}` : null
  );

  if (!organization) return <NoOrganization />;
  if (tripRes.error) return <ErrorBox message={tripRes.error} />;
  if (!tripRes.data) return <Loading />;

  const trip = tripRes.data.data;

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this dispatch trip run-sheet?")) return;
    setCancelling(true);
    try {
      await api.post(`${transportRoot(organization.id)}/trips/${trip.id}/cancel`, {
        reason: "Manually cancelled from run-sheet dashboard",
      });
      tripRes.reload();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

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

  const legs = trip.trip_legs || [];
  const pods = trip.proof_of_deliveries || [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/transport/trips" className="hover:text-primary transition-colors">
              Dispatch Run-Sheets
            </Link>
            <span>/</span>
            <span className="font-mono text-foreground">{trip.trip_number}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {trip.trip_number}
            </h1>
            {getStatusBadge(trip.status)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trip.status === "draft" && can("transport.manage") && (
            <DispatchModal trip={trip} onDispatched={tripRes.reload} />
          )}

          {trip.status === "in_transit" && can("transport.manage") && (
            <PodModal trip={trip} onDelivered={tripRes.reload} />
          )}

          {["draft", "in_transit"].includes(trip.status) && can("transport.cancel") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              Cancel Run-Sheet
            </Button>
          )}
        </div>
      </div>

      {/* Main Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vehicle */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Truck size={14} /> Assigned Vehicle
            </span>
            {trip.vehicle && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {trip.vehicle.ownership_type}
              </Badge>
            )}
          </div>
          {trip.vehicle ? (
            <div>
              <div className="font-mono font-bold text-lg text-foreground">
                {trip.vehicle.plate_number}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {trip.vehicle.make_model}
              </div>
              <div className="text-xs text-slate-700 font-mono mt-2 bg-slate-50 p-2 rounded">
                Max Payload: {Number(trip.vehicle.max_payload_kg).toLocaleString()} kg
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic py-2">
              No vehicle assigned
            </div>
          )}
        </div>

        {/* Driver */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User size={14} /> Assigned Driver
            </span>
          </div>
          {trip.driver ? (
            <div>
              <div className="font-bold text-base text-foreground">
                {trip.driver.full_name}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {trip.driver.phone}
              </div>
              <div className="text-xs text-slate-700 font-mono mt-2 bg-slate-50 p-2 rounded">
                License: {trip.driver.license_number} ({trip.driver.license_type})
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic py-2">
              No driver assigned
            </div>
          )}
        </div>

        {/* Route Details */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Route size={14} /> Operational Corridor
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5" />
              <div>
                <div className="text-xs font-bold text-foreground">
                  {trip.origin_location?.name || "Origin"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {trip.origin_location?.city}, {trip.origin_location?.country_code}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
              <div>
                <div className="text-xs font-bold text-foreground">
                  {trip.destination_location?.name || "Destination"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {trip.destination_location?.city}, {trip.destination_location?.country_code}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Run-Sheet Technical Metrics */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Gauge size={14} /> Trip Telematics & Equipment
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block">Departure Odometer</span>
            <span className="font-mono font-semibold text-foreground text-sm">
              {trip.odometer_start_km ? `${trip.odometer_start_km} KM` : "Not recorded"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Container #</span>
            <span className="font-mono font-semibold text-foreground text-sm uppercase">
              {trip.container_number || "Break-bulk / None"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Seal #</span>
            <span className="font-mono font-semibold text-foreground text-sm uppercase">
              {trip.seal_number || "None"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Actual Departure</span>
            <span className="font-medium text-foreground text-xs">
              {trip.actual_start_time
                ? new Date(trip.actual_start_time).toLocaleString()
                : "Awaiting dispatch"}
            </span>
          </div>
        </div>
      </div>

      {/* Attached Shipment Cargo Legs */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-slate-50/80 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Package size={14} /> Attached Cargo Legs ({legs.length})
          </h2>
        </div>

        {legs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No shipment cargo legs attached to this run-sheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Sequence</th>
                  <th className="px-4 py-3">Shipment Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Leg Type & Mode</th>
                  <th className="px-4 py-3">Leg Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {legs.map((tl) => {
                  const sl = tl.shipment_leg;
                  return (
                    <tr key={tl.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                        #{tl.sequence}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                        {sl?.shipment ? (
                          <Link href={`/freight/shipments/${sl.shipment.id}`} className="hover:underline">
                            {sl.shipment.shipment_number}
                          </Link>
                        ) : (
                          `Leg #${sl?.id}`
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-foreground font-medium">
                        {sl?.shipment?.customer?.name || "Direct Customer"}
                      </td>
                      <td className="px-4 py-3.5 text-xs uppercase font-medium text-slate-700">
                        {sl?.leg_type.replace(/_/g, " ")} ({sl?.transport_mode})
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {sl?.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof of Delivery (POD) Records */}
      {pods.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="text-emerald-600" size={20} />
            <h2 className="text-base font-bold text-foreground">
              Proof of Delivery (POD) Confirmation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs border rounded-lg p-4 bg-slate-50/50">
            <div>
              <span className="text-muted-foreground block">Signatory / Recipient</span>
              <span className="font-semibold text-foreground text-sm">
                {pods[0].recipient_name}
              </span>
              {pods[0].recipient_phone && (
                <span className="text-muted-foreground block font-mono">
                  {pods[0].recipient_phone}
                </span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block">Delivered At</span>
              <span className="font-semibold text-foreground text-sm">
                {new Date(pods[0].delivered_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Packages Received</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {pods[0].received_packages} pkgs
              </span>
              {Number(pods[0].damaged_packages) > 0 && (
                <span className="font-mono text-red-600 block">
                  ({pods[0].damaged_packages} damaged)
                </span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block">Remarks</span>
              <span className="text-slate-700 block italic">
                &ldquo;{pods[0].signatory_remarks || "No remarks"}&rdquo;
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
