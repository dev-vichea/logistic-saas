"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Truck,
  Ship,
  Plane,
  Layers,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Building2,
  Plus,
  Loader2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type Shipment, type FreightCatalog } from "@/lib/freight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api";

export function ShipmentDetail({ shipmentId }: { shipmentId: number }) {
  const { organization, can } = useWorkspace();
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  const [milestoneForm, setMilestoneForm] = useState({
    code: "DISPATCHED",
    title: "Cargo Dispatched",
    description: "",
    location_name: "",
    occurred_at: new Date().toISOString().slice(0, 16),
    is_exception: false,
  });

  const shipmentRes = useResource<{ data: Shipment }>(
    organization ? `${freightRoot(organization.id)}/shipments/${shipmentId}` : null
  );

  const catalogRes = useResource<{ data: FreightCatalog }>(
    organization ? `${freightRoot(organization.id)}/catalog` : null
  );

  if (!organization) return <NoOrganization />;
  if (shipmentRes.error) return <ErrorBox message={shipmentRes.error} />;
  if (!shipmentRes.data || !catalogRes.data) return <Loading />;

  const shipment = shipmentRes.data.data;
  const catalog = catalogRes.data.data;

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setSavingMilestone(true);
    setMilestoneError(null);

    try {
      await api.post(`${freightRoot(organization.id)}/shipments/${shipment.id}/milestones`, {
        ...milestoneForm,
        occurred_at: new Date(milestoneForm.occurred_at).toISOString(),
      });
      setMilestoneOpen(false);
      shipmentRes.reload();
    } catch (err) {
      setMilestoneError(errorMessage(err));
    } finally {
      setSavingMilestone(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ocean_fcl":
      case "ocean_lcl":
      case "ocean":
        return <Ship size={16} className="text-blue-600" />;
      case "air":
        return <Plane size={16} className="text-sky-600" />;
      case "multimodal":
        return <Layers size={16} className="text-purple-600" />;
      default:
        return <Truck size={16} className="text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/freight/shipments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to all shipments
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="eyebrow text-primary">Operational Shipment</span>
              <Badge variant="outline" className="font-mono text-xs uppercase bg-slate-50">
                {shipment.transport_mode.replace("_", " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {shipment.status.replace("_", " ")}
              </Badge>
              {shipment.customs_status !== "not_applicable" && (
                <Badge variant="outline" className="text-xs border-indigo-200 bg-indigo-50/50 text-indigo-700">
                  Customs: {shipment.customs_status.replace("_", " ")}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              {shipment.shipment_number}
            </h1>

            {shipment.master_tracking_number && (
              <p className="text-sm font-mono text-muted-foreground mt-1">
                Master Tracking / B/L: <span className="text-foreground font-semibold">{shipment.master_tracking_number}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {can("freight.manage") && (
              <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-sm">
                    <Plus size={16} />
                    Record Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Operational Milestone</DialogTitle>
                    <DialogDescription>
                      Log milestone updates, departures, customs clearance events, or delivery notes.
                    </DialogDescription>
                  </DialogHeader>

                  {milestoneError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                      {milestoneError}
                    </div>
                  )}

                  <form onSubmit={handleMilestoneSubmit} className="space-y-4 pt-2">
                    <div>
                      <Label htmlFor="milestone_preset">Milestone Event *</Label>
                      <select
                        id="milestone_preset"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        value={milestoneForm.code}
                        onChange={(e) => {
                          const preset = catalog.milestone_presets.find((p) => p.code === e.target.value);
                          setMilestoneForm({
                            ...milestoneForm,
                            code: e.target.value,
                            title: preset?.title || e.target.value,
                          });
                        }}
                      >
                        {catalog.milestone_presets.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="milestone_title">Milestone Title *</Label>
                      <Input
                        id="milestone_title"
                        required
                        value={milestoneForm.title}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="occurred_at">Occurred Timestamp *</Label>
                        <Input
                          id="occurred_at"
                          type="datetime-local"
                          required
                          value={milestoneForm.occurred_at}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, occurred_at: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location_name">Location Name / Terminal</Label>
                        <Input
                          id="location_name"
                          placeholder="e.g. Sihanoukville Port Gate 2"
                          value={milestoneForm.location_name}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, location_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Event Notes / Description</Label>
                      <Textarea
                        id="description"
                        rows={3}
                        placeholder="Driver remarks, container seal verification, inspector notes..."
                        value={milestoneForm.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_exception"
                        checked={milestoneForm.is_exception}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, is_exception: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <Label htmlFor="is_exception" className="text-xs text-muted-foreground font-normal">
                        Flag as operational exception / delay
                      </Label>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="button" variant="outline" onClick={() => setMilestoneOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingMilestone}>
                        {savingMilestone && <Loader2 size={16} className="mr-2 animate-spin" />}
                        Save Milestone
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Origin to Destination Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
            <span className="text-xs uppercase font-medium text-muted-foreground block mb-1">Origin Facility</span>
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <MapPin size={15} className="text-primary shrink-0" />
              {shipment.origin_location?.name || "Origin Location"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {shipment.origin_location?.city}, {shipment.origin_location?.country_code}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
            <span className="text-xs uppercase font-medium text-muted-foreground block mb-1">Destination Facility</span>
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <MapPin size={15} className="text-primary shrink-0" />
              {shipment.destination_location?.name || "Destination Location"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {shipment.destination_location?.city}, {shipment.destination_location?.country_code}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
            <span className="text-xs uppercase font-medium text-muted-foreground block mb-1">Parties & Partners</span>
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Building2 size={15} className="text-muted-foreground shrink-0" />
              Customer: {shipment.customer?.name || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Carrier: {shipment.carrier?.name || "Direct / Self-managed"}
            </p>
          </div>
        </div>
      </div>

      {/* Multimodal Transport Legs */}
      <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Multimodal Transport Legs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sequential legs executed across road haulage, ocean voyages, and inland dispatch.
            </p>
          </div>
        </div>

        {(!shipment.legs || shipment.legs.length === 0) ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No transit legs explicitly configured. Standard direct movement active.
          </div>
        ) : (
          <div className="space-y-4">
            {shipment.legs.map((leg) => (
              <div
                key={leg.id}
                className="rounded-xl border p-4 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-white border shadow-sm flex items-center justify-center shrink-0">
                    {getModeIcon(leg.transport_mode)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        Leg {leg.sequence}
                      </span>
                      <span className="text-sm font-semibold capitalize text-foreground">
                        {leg.leg_type.replace("_", " ")} ({leg.transport_mode})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{leg.origin_location?.city || leg.origin_location?.name}</span>
                      <ArrowRight size={12} />
                      <span>{leg.destination_location?.city || leg.destination_location?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {leg.carrier && (
                    <span className="text-muted-foreground">
                      Carrier: <strong className="text-foreground">{leg.carrier.name}</strong>
                    </span>
                  )}
                  {leg.vessel_or_flight_or_plate && (
                    <span className="font-mono bg-white px-2 py-1 rounded border text-foreground">
                      {leg.vessel_or_flight_or_plate}
                    </span>
                  )}
                  <Badge variant="outline" className="capitalize text-xs">
                    {leg.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cargo Items Breakdown */}
      <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Cargo Manifest & Commodities</h2>
        {(!shipment.cargo_items || shipment.cargo_items.length === 0) ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No cargo items currently registered for this shipment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Package Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Weight (KG)</th>
                  <th className="px-4 py-3 text-right">Volume (CBM)</th>
                  <th className="px-4 py-3">Container / Seal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipment.cargo_items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{item.package_type}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.gross_weight_kg}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.volume_cbm}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.container_number ? `${item.container_number} (${item.seal_number || "No seal"})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestone Activity Timeline */}
      <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-6">Milestone History & Audit Timeline</h2>
        {(!shipment.milestones || shipment.milestones.length === 0) ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No milestones logged yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
            {shipment.milestones.map((m) => (
              <div key={m.id} className="relative group">
                <div
                  className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 bg-white ${
                    m.is_exception ? "border-red-500 bg-red-100" : "border-primary"
                  }`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{m.title}</span>
                    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                      {m.code}
                    </Badge>
                    {m.is_exception && (
                      <Badge variant="destructive" className="text-[10px]">
                        Exception
                      </Badge>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground font-mono">
                    {new Date(m.occurred_at).toLocaleString()}
                  </time>
                </div>

                {m.location_name && (
                  <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                    <MapPin size={12} />
                    {m.location_name}
                  </p>
                )}

                {m.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{m.description}</p>
                )}

                {m.created_by_user && (
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Logged by {m.created_by_user.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
