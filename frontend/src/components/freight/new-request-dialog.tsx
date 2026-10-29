"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Building2, MapPin, Package, Calendar } from "lucide-react";
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

export function NewRequestDialog({
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

  const partnersRes = useResource<{ data: Partner[] }>(
    organization ? `${partnerRoot(organization.id)}?per_page=100` : null
  );

  const partners = partnersRes.data?.data || [];
  const customers = partners.filter((p) => p.roles.includes("customer") || p.roles.includes("shipper"));

  const [formData, setFormData] = useState({
    request_number: "",
    customer_id: "",
    origin_location_id: "",
    destination_location_id: "",
    transport_mode: "road",
    incoterm: "FOB",
    cargo_description: "",
    package_type: "cartons",
    total_pieces: 100,
    total_weight_kg: 1000,
    total_volume_cbm: 5.0,
    target_readiness_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        transport_mode: formData.transport_mode,
        incoterm: formData.incoterm,
        package_type: formData.package_type,
        total_pieces: Number(formData.total_pieces),
        total_weight_kg: Number(formData.total_weight_kg),
        total_volume_cbm: Number(formData.total_volume_cbm),
        cargo_description: formData.cargo_description.trim() || "General Cargo",
      };

      if (formData.request_number.trim()) payload.request_number = formData.request_number.trim();
      if (formData.customer_id) payload.customer_id = Number(formData.customer_id);
      if (formData.origin_location_id) payload.origin_location_id = Number(formData.origin_location_id);
      if (formData.destination_location_id) payload.destination_location_id = Number(formData.destination_location_id);
      if (formData.target_readiness_date) payload.target_readiness_date = formData.target_readiness_date;
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      await api.post(`${freightRoot(organization.id)}/requests`, payload);
      setOpen(false);
      if (onCreated) {
        onCreated();
      } else {
        router.refresh();
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
          New Freight Request
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="lg" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold text-xs">
                RFQ
              </span>
              <div>
                <SheetTitle>New Freight Inquiry / Request</SheetTitle>
                <SheetDescription>
                  Record an incoming cargo transport inquiry from a customer or shipper.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* Shipper & Contract Terms */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Building2 size={15} className="text-blue-900" />
                <span>Customer & Commercial Terms</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="req_customer_id" className="text-xs font-semibold text-slate-700">
                    Customer / Shipper *
                  </Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
                  >
                    <SelectTrigger id="req_customer_id" className="mt-1">
                      <SelectValue placeholder="Select customer / shipper..." />
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
                  <Label htmlFor="req_transport_mode" className="text-xs font-semibold text-slate-700">
                    Transport Mode *
                  </Label>
                  <Select
                    value={formData.transport_mode}
                    onValueChange={(val) => setFormData({ ...formData, transport_mode: val })}
                  >
                    <SelectTrigger id="req_transport_mode" className="mt-1">
                      <SelectValue placeholder="Select transport mode..." />
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="req_incoterm" className="text-xs font-semibold text-slate-700">
                    Incoterm
                  </Label>
                  <Select
                    value={formData.incoterm}
                    onValueChange={(val) => setFormData({ ...formData, incoterm: val })}
                  >
                    <SelectTrigger id="req_incoterm" className="mt-1">
                      <SelectValue placeholder="Select incoterm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.incoterms.map((inc) => (
                        <SelectItem key={inc} value={inc}>
                          {inc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="req_request_number" className="text-xs font-semibold text-slate-700">
                    Inquiry Reference (Optional)
                  </Label>
                  <Input
                    id="req_request_number"
                    placeholder="e.g. REQ-2026-0042"
                    value={formData.request_number}
                    onChange={(e) => setFormData({ ...formData, request_number: e.target.value })}
                    className="mt-1 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Routing / Facilities */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <MapPin size={15} className="text-blue-900" />
                <span>Routing & Facilities</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="req_origin_location_id" className="text-xs font-semibold text-slate-700">
                    Origin Facility ID *
                  </Label>
                  <Input
                    id="req_origin_location_id"
                    required
                    type="number"
                    placeholder="e.g. 1 (Phnom Penh Hub)"
                    value={formData.origin_location_id}
                    onChange={(e) => setFormData({ ...formData, origin_location_id: e.target.value })}
                    className="mt-1 bg-white font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="req_destination_location_id" className="text-xs font-semibold text-slate-700">
                    Destination Facility ID *
                  </Label>
                  <Input
                    id="req_destination_location_id"
                    required
                    type="number"
                    placeholder="e.g. 2 (Sihanoukville Port)"
                    value={formData.destination_location_id}
                    onChange={(e) => setFormData({ ...formData, destination_location_id: e.target.value })}
                    className="mt-1 bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Cargo Specifications */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Package size={15} className="text-blue-900" />
                <span>Cargo Specifications</span>
              </div>

              <div>
                <Label htmlFor="req_cargo_description" className="text-xs font-semibold text-slate-700">
                  Cargo Description
                </Label>
                <Input
                  id="req_cargo_description"
                  placeholder="e.g. 100 cartons of cotton garments, machinery parts"
                  value={formData.cargo_description}
                  onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                  className="mt-1 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="req_total_pieces" className="text-xs font-semibold text-slate-700">
                    Pieces
                  </Label>
                  <Input
                    id="req_total_pieces"
                    type="number"
                    value={formData.total_pieces}
                    onChange={(e) => setFormData({ ...formData, total_pieces: Number(e.target.value) })}
                    className="mt-1 bg-white font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="req_total_weight_kg" className="text-xs font-semibold text-slate-700">
                    Weight (KG)
                  </Label>
                  <Input
                    id="req_total_weight_kg"
                    type="number"
                    step="0.01"
                    value={formData.total_weight_kg}
                    onChange={(e) => setFormData({ ...formData, total_weight_kg: Number(e.target.value) })}
                    className="mt-1 bg-white font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="req_total_volume_cbm" className="text-xs font-semibold text-slate-700">
                    Volume (CBM)
                  </Label>
                  <Input
                    id="req_total_volume_cbm"
                    type="number"
                    step="0.001"
                    value={formData.total_volume_cbm}
                    onChange={(e) => setFormData({ ...formData, total_volume_cbm: Number(e.target.value) })}
                    className="mt-1 bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Schedule & Notes */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Calendar size={15} className="text-blue-900" />
                <span>Schedule & Instructions</span>
              </div>

              <div>
                <Label htmlFor="req_readiness_date" className="text-xs font-semibold text-slate-700">
                  Target Readiness Date
                </Label>
                <Input
                  id="req_readiness_date"
                  type="date"
                  value={formData.target_readiness_date}
                  onChange={(e) => setFormData({ ...formData, target_readiness_date: e.target.value })}
                  className="mt-1 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="req_notes" className="text-xs font-semibold text-slate-700">
                  Operational Notes & Special Instructions
                </Label>
                <Textarea
                  id="req_notes"
                  rows={3}
                  placeholder="Special handling instructions, required customs clearance, bonded warehouse..."
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
            >
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
              Submit Request
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
