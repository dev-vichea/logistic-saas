"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Ship, MapPin, Building2, Truck } from "lucide-react";
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
import { api, errorMessage } from "@/lib/api";
import { freightRoot, type FreightCatalog } from "@/lib/freight";
import { partnerRoot, type Partner } from "@/lib/partners";
import { useResource } from "@/lib/use-resource";

export function NewShipmentDialog({
  catalog,
  onCreated,
}: {
  catalog: FreightCatalog;
  onCreated?: () => void;
}) {
  const { organization } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Partners for Customer & Carrier
  const partnersRes = useResource<{ data: Partner[] }>(
    organization ? `${partnerRoot(organization.id)}?per_page=100` : null
  );

  const partners = partnersRes.data?.data || [];
  const customers = partners.filter((p) => p.roles.includes("customer") || p.roles.includes("shipper"));
  const carriers = partners.filter((p) => p.roles.includes("carrier") || p.roles.includes("freight_forwarder"));

  const [formData, setFormData] = useState({
    shipment_number: "",
    customer_id: "",
    carrier_id: "",
    origin_location_id: "",
    destination_location_id: "",
    transport_mode: "road",
    master_tracking_number: "",
    status: "draft",
    customs_status: "not_applicable",
    etd: "",
    eta: "",
    special_instructions: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        transport_mode: formData.transport_mode,
        status: formData.status,
        customs_status: formData.customs_status,
      };

      if (formData.shipment_number.trim()) payload.shipment_number = formData.shipment_number.trim();
      if (formData.customer_id) payload.customer_id = Number(formData.customer_id);
      if (formData.carrier_id && formData.carrier_id !== "none") payload.carrier_id = Number(formData.carrier_id);
      if (formData.origin_location_id) payload.origin_location_id = Number(formData.origin_location_id);
      if (formData.destination_location_id) payload.destination_location_id = Number(formData.destination_location_id);
      if (formData.master_tracking_number.trim()) payload.master_tracking_number = formData.master_tracking_number.trim();
      if (formData.etd) payload.etd = formData.etd;
      if (formData.eta) payload.eta = formData.eta;
      if (formData.special_instructions.trim()) payload.special_instructions = formData.special_instructions.trim();

      const res = await api.post(`${freightRoot(organization.id)}/shipments`, payload);
      setOpen(false);
      if (onCreated) {
        onCreated();
      } else {
        router.push(`/freight/shipments/${res.data.data.id}`);
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
        <Button className="gap-2 shadow-2xs">
          <Plus size={16} />
          Create Shipment
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="lg" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold text-xs">
                SHP
              </span>
              <div>
                <SheetTitle>New Operational Shipment</SheetTitle>
                <SheetDescription>
                  Plan and register a new shipment with multimodal tracking, carrier legs, and customs checkpoints.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {/* Shipment References */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Ship size={15} className="text-blue-900" />
                <span>Shipment Reference & Master Tracking</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipment_number" className="text-xs font-semibold text-slate-700">
                    Shipment Reference (Optional)
                  </Label>
                  <Input
                    id="shipment_number"
                    placeholder="Auto-generated if empty"
                    value={formData.shipment_number}
                    onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                    className="mt-1 bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="master_tracking_number" className="text-xs font-semibold text-slate-700">
                    Master B/L / AWB / Tracking #
                  </Label>
                  <Input
                    id="master_tracking_number"
                    placeholder="e.g. OOCL-1099238"
                    value={formData.master_tracking_number}
                    onChange={(e) => setFormData({ ...formData, master_tracking_number: e.target.value })}
                    className="mt-1 bg-white font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Partners */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Building2 size={15} className="text-blue-900" />
                <span>Commercial Stakeholders</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_id" className="text-xs font-semibold text-slate-700">
                    Customer / Shipper *
                  </Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
                  >
                    <SelectTrigger id="customer_id" className="mt-1">
                      <SelectValue placeholder="Select customer partner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="carrier_id" className="text-xs font-semibold text-slate-700">
                    Primary Carrier / Fleet Partner
                  </Label>
                  <Select
                    value={formData.carrier_id}
                    onValueChange={(val) => setFormData({ ...formData, carrier_id: val })}
                  >
                    <SelectTrigger id="carrier_id" className="mt-1">
                      <SelectValue placeholder="Select carrier (Optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Carrier Assigned</SelectItem>
                      {carriers.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Transport Mode & Customs */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Truck size={15} className="text-blue-900" />
                <span>Transport Mode & Customs Compliance</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transport_mode" className="text-xs font-semibold text-slate-700">
                    Transport Mode *
                  </Label>
                  <Select
                    value={formData.transport_mode}
                    onValueChange={(val) => setFormData({ ...formData, transport_mode: val })}
                  >
                    <SelectTrigger id="transport_mode" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.transport_modes.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customs_status" className="text-xs font-semibold text-slate-700">
                    Customs Status
                  </Label>
                  <Select
                    value={formData.customs_status}
                    onValueChange={(val) => setFormData({ ...formData, customs_status: val })}
                  >
                    <SelectTrigger id="customs_status" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.customs_statuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Routing Facilities */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <MapPin size={15} className="text-blue-900" />
                <span>Routing Hubs & Terminals</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin_location_id" className="text-xs font-semibold text-slate-700">
                    Origin Facility *
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
                    Destination Facility *
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
                  <Label htmlFor="etd" className="text-xs font-semibold text-slate-700">
                    Estimated Departure (ETD)
                  </Label>
                  <Input
                    id="etd"
                    type="datetime-local"
                    value={formData.etd}
                    onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="eta" className="text-xs font-semibold text-slate-700">
                    Estimated Arrival (ETA)
                  </Label>
                  <Input
                    id="eta"
                    type="datetime-local"
                    value={formData.eta}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <Label htmlFor="special_instructions" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Special Instructions & Operational Notes
              </Label>
              <Textarea
                id="special_instructions"
                rows={3}
                placeholder="Driver instructions, border crossing requirements, cargo handling details..."
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                className="bg-white text-xs"
              />
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
            >
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
              Create Shipment
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
