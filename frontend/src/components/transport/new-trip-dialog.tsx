"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Route, Truck, MapPin } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api, errorMessage } from "@/lib/api";
import { transportRoot, type TransportationCatalog } from "@/lib/transportation";

export function NewTripDialog({
  catalog,
  onCreated,
}: {
  catalog: TransportationCatalog;
  onCreated?: () => void;
}) {
  const { organization } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    trip_number: "",
    vehicle_id: "",
    driver_id: "",
    origin_location_id: "",
    destination_location_id: "",
    container_number: "",
    seal_number: "",
    scheduled_start_time: "",
    notes: "",
  });

  const [selectedLegIds, setSelectedLegIds] = useState<number[]>([]);

  const toggleLeg = (legId: number) => {
    setSelectedLegIds((prev) =>
      prev.includes(legId) ? prev.filter((id) => id !== legId) : [...prev, legId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        origin_location_id: Number(formData.origin_location_id),
        destination_location_id: Number(formData.destination_location_id),
      };

      if (formData.trip_number.trim()) payload.trip_number = formData.trip_number.trim();
      if (formData.vehicle_id) payload.vehicle_id = Number(formData.vehicle_id);
      if (formData.driver_id) payload.driver_id = Number(formData.driver_id);
      if (formData.container_number.trim()) payload.container_number = formData.container_number.trim();
      if (formData.seal_number.trim()) payload.seal_number = formData.seal_number.trim();
      if (formData.scheduled_start_time) payload.scheduled_start_time = formData.scheduled_start_time;
      if (formData.notes.trim()) payload.notes = formData.notes.trim();
      if (selectedLegIds.length > 0) payload.shipment_leg_ids = selectedLegIds;

      const res = await api.post(`${transportRoot(organization.id)}/trips`, payload);
      setOpen(false);
      if (onCreated) {
        onCreated();
      } else {
        router.push(`/transport/trips/${res.data.data.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="h-9 gap-1.5 shadow-2xs">
          <Plus size={16} />
          <span>Plan Dispatch Run-Sheet</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="lg" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs">
                TRP
              </span>
              <div>
                <SheetTitle>Create Dispatch Trip Run-Sheet</SheetTitle>
                <SheetDescription>
                  Assign vehicle, driver, and shipment cargo legs for operational road transit.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Trip Reference & Departure */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Route size={15} className="text-blue-900" />
                <span>Trip Identifiers & Schedule</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trip_number" className="text-xs font-semibold text-slate-700">
                    Run-Sheet # (Optional)
                  </Label>
                  <Input
                    id="trip_number"
                    placeholder="Auto e.g. TRP-2026-0045"
                    value={formData.trip_number}
                    onChange={(e) => setFormData({ ...formData, trip_number: e.target.value })}
                    className="mt-1 bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_start_time" className="text-xs font-semibold text-slate-700">
                    Scheduled Departure Time
                  </Label>
                  <Input
                    id="scheduled_start_time"
                    type="datetime-local"
                    value={formData.scheduled_start_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Fleet & Crew Allocation */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Truck size={15} className="text-blue-900" />
                <span>Vehicle & Driver Allocation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle_id" className="text-xs font-semibold text-slate-700">
                    Assigned Truck / Tractor *
                  </Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(val) => setFormData({ ...formData, vehicle_id: val })}
                  >
                    <SelectTrigger id="vehicle_id" className="mt-1">
                      <SelectValue placeholder="Select vehicle from fleet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.plate_number} — {v.make_model} ({v.current_status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="driver_id" className="text-xs font-semibold text-slate-700">
                    Assigned Driver *
                  </Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(val) => setFormData({ ...formData, driver_id: val })}
                  >
                    <SelectTrigger id="driver_id" className="mt-1">
                      <SelectValue placeholder="Select driver from roster..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.drivers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.full_name} ({d.phone}) — {d.current_status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Hubs */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <MapPin size={15} className="text-blue-900" />
                <span>Dispatch Origin & Destination</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin_location_id" className="text-xs font-semibold text-slate-700">
                    Origin Dispatch Hub / Factory *
                  </Label>
                  <Select
                    value={formData.origin_location_id}
                    onValueChange={(val) => setFormData({ ...formData, origin_location_id: val })}
                  >
                    <SelectTrigger id="origin_location_id" className="mt-1">
                      <SelectValue placeholder="Select origin facility..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name} ({loc.city}, {loc.country_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destination_location_id" className="text-xs font-semibold text-slate-700">
                    Destination Hub / Border / Port *
                  </Label>
                  <Select
                    value={formData.destination_location_id}
                    onValueChange={(val) => setFormData({ ...formData, destination_location_id: val })}
                  >
                    <SelectTrigger id="destination_location_id" className="mt-1">
                      <SelectValue placeholder="Select destination facility..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name} ({loc.city}, {loc.country_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="container_number" className="text-xs font-semibold text-slate-700">
                    Container Number (FCL)
                  </Label>
                  <Input
                    id="container_number"
                    placeholder="e.g. MSCU-992182-1"
                    value={formData.container_number}
                    onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                    className="mt-1 bg-white font-mono uppercase text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="seal_number" className="text-xs font-semibold text-slate-700">
                    Customs / Carrier Seal Number
                  </Label>
                  <Input
                    id="seal_number"
                    placeholder="e.g. SL-889128"
                    value={formData.seal_number}
                    onChange={(e) => setFormData({ ...formData, seal_number: e.target.value })}
                    className="mt-1 bg-white font-mono uppercase text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Cargo Legs */}
            {catalog.dispatchable_legs && catalog.dispatchable_legs.length > 0 && (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-3">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Attach Scheduled Shipment Cargo Legs
                </Label>
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white max-h-48 overflow-y-auto shadow-2xs">
                  {catalog.dispatchable_legs.map((leg) => (
                    <div
                      key={leg.id}
                      onClick={() => toggleLeg(leg.id)}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                    >
                      <Checkbox
                        checked={selectedLegIds.includes(leg.id)}
                        onCheckedChange={() => toggleLeg(leg.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900">
                          Leg #{leg.sequence}: {leg.leg_type.replace(/_/g, " ").toUpperCase()} ({leg.transport_mode.toUpperCase()})
                        </div>
                        <div className="text-slate-500 text-[11px] truncate">
                          {leg.origin_location?.name} ({leg.origin_location?.city}) &rarr; {leg.destination_location?.name} ({leg.destination_location?.city})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <Label htmlFor="trip_notes" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Special Route Instructions / Dispatch Remarks
              </Label>
              <Textarea
                id="trip_notes"
                rows={2}
                placeholder="e.g. Stop at Kampong Cham weigh station. Border customs broker: Mr. Rithy."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white text-xs"
              />
            </div>
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
            >
              {saving ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
              Create Run-Sheet
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
