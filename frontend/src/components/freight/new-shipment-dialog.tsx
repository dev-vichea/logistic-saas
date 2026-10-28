"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
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
      if (formData.carrier_id) payload.carrier_id = Number(formData.carrier_id);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <Plus size={16} />
          Create Shipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Operational Shipment</DialogTitle>
          <DialogDescription>
            Plan and register a new shipment in Mekong with multimodal tracking.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipment_number">Shipment Reference (Optional)</Label>
              <Input
                id="shipment_number"
                placeholder="Auto-generated if empty"
                value={formData.shipment_number}
                onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="master_tracking_number">Master B/L / AWB / Tracking #</Label>
              <Input
                id="master_tracking_number"
                placeholder="e.g. OOCL-1099238"
                value={formData.master_tracking_number}
                onChange={(e) => setFormData({ ...formData, master_tracking_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_id">Customer / Shipper *</Label>
              <select
                id="customer_id"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              >
                <option value="">Select customer partner...</option>
                {customers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="carrier_id">Primary Carrier / Fleet Partner</Label>
              <select
                id="carrier_id"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={formData.carrier_id}
                onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
              >
                <option value="">Select carrier partner (Optional)...</option>
                {carriers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transport_mode">Transport Mode *</Label>
              <select
                id="transport_mode"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={formData.transport_mode}
                onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value })}
              >
                {catalog.transport_modes.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="customs_status">Customs Status</Label>
              <select
                id="customs_status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={formData.customs_status}
                onChange={(e) => setFormData({ ...formData, customs_status: e.target.value })}
              >
                {catalog.customs_statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin_location_id">Origin Location *</Label>
              <Input
                id="origin_location_id"
                required
                type="number"
                placeholder="Location ID"
                value={formData.origin_location_id}
                onChange={(e) => setFormData({ ...formData, origin_location_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="destination_location_id">Destination Location *</Label>
              <Input
                id="destination_location_id"
                required
                type="number"
                placeholder="Location ID"
                value={formData.destination_location_id}
                onChange={(e) => setFormData({ ...formData, destination_location_id: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="etd">Estimated Departure (ETD)</Label>
              <Input
                id="etd"
                type="datetime-local"
                value={formData.etd}
                onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="eta">Estimated Arrival (ETA)</Label>
              <Input
                id="eta"
                type="datetime-local"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="special_instructions">Special Instructions & Operational Notes</Label>
            <Textarea
              id="special_instructions"
              rows={3}
              placeholder="Driver instructions, border crossing requirements, cargo handling details..."
              value={formData.special_instructions}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, special_instructions: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
              Create Shipment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
