"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Bookmark, Building2, MapPin, Package } from "lucide-react";
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

interface CargoItemDraft {
  description: string;
  package_type: string;
  quantity: number;
  gross_weight_kg: number;
  volume_cbm: number;
}

export function NewBookingDialog({
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
    booking_number: "",
    customer_reference: "",
    customer_id: "",
    origin_location_id: "",
    destination_location_id: "",
    transport_mode: "ocean_fcl",
    incoterm: "FOB",
    total_amount: 2135.0,
    currency: "USD",
    notes: "",
  });

  const [cargoItems, setCargoItems] = useState<CargoItemDraft[]>([
    {
      description: "Apparel and textile garment cartons",
      package_type: "cartons",
      quantity: 500,
      gross_weight_kg: 4200,
      volume_cbm: 24.5,
    },
  ]);

  const addCargoItem = () => {
    setCargoItems((prev) => [
      ...prev,
      {
        description: "",
        package_type: "cartons",
        quantity: 10,
        gross_weight_kg: 100,
        volume_cbm: 1.0,
      },
    ]);
  };

  const removeCargoItem = (index: number) => {
    if (cargoItems.length === 1) return;
    setCargoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCargoItem = (index: number, field: keyof CargoItemDraft, value: string | number) => {
    setCargoItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        customer_id: Number(formData.customer_id),
        origin_location_id: Number(formData.origin_location_id),
        destination_location_id: Number(formData.destination_location_id),
        transport_mode: formData.transport_mode,
        incoterm: formData.incoterm,
        total_amount: Number(formData.total_amount) || 0,
        currency: formData.currency,
        items: cargoItems.map((item) => ({
          description: item.description.trim() || "Cargo Line",
          package_type: item.package_type,
          quantity: Number(item.quantity) || 1,
          gross_weight_kg: Number(item.gross_weight_kg) || 0,
          volume_cbm: Number(item.volume_cbm) || 0,
        })),
      };

      if (formData.booking_number.trim()) payload.booking_number = formData.booking_number.trim();
      if (formData.customer_reference.trim()) payload.customer_reference = formData.customer_reference.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      await api.post(`${freightRoot(organization.id)}/bookings`, payload);
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
          New Booking
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="lg" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold text-xs">
                BKG
              </span>
              <div>
                <SheetTitle>New Freight Booking</SheetTitle>
                <SheetDescription>
                  Create an operational booking reservation with cargo manifest line items.
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

            {/* References */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Bookmark size={15} className="text-blue-900" />
                <span>Booking & Customer Identifiers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_number" className="text-xs font-semibold text-slate-700">
                    Booking # (Optional)
                  </Label>
                  <Input
                    id="booking_number"
                    placeholder="Auto-generated e.g. BKG-2026-0034"
                    value={formData.booking_number}
                    onChange={(e) => setFormData({ ...formData, booking_number: e.target.value })}
                    className="mt-1 bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_reference" className="text-xs font-semibold text-slate-700">
                    Customer PO / Reference #
                  </Label>
                  <Input
                    id="customer_reference"
                    placeholder="e.g. PO-889104-KH"
                    value={formData.customer_reference}
                    onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
                    className="mt-1 bg-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Shipper & Commercial */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Building2 size={15} className="text-blue-900" />
                <span>Customer & Total Freight</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_customer_id" className="text-xs font-semibold text-slate-700">
                    Customer / Shipper *
                  </Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
                  >
                    <SelectTrigger id="booking_customer_id" className="mt-1">
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} ({c.country_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="total_amount" className="text-xs font-semibold text-slate-700">
                    Agreed Freight Total ({formData.currency})
                  </Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 bg-white text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Routing */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <MapPin size={15} className="text-blue-900" />
                <span>Routing Facilities & Mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_origin_location_id" className="text-xs font-semibold text-slate-700">
                    Origin Facility *
                  </Label>
                  <Select
                    value={formData.origin_location_id}
                    onValueChange={(val) => setFormData({ ...formData, origin_location_id: val })}
                  >
                    <SelectTrigger id="booking_origin_location_id" className="mt-1">
                      <SelectValue placeholder="Select origin..." />
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
                  <Label htmlFor="booking_destination_location_id" className="text-xs font-semibold text-slate-700">
                    Destination Facility *
                  </Label>
                  <Select
                    value={formData.destination_location_id}
                    onValueChange={(val) =>
                      setFormData({ ...formData, destination_location_id: val })
                    }
                  >
                    <SelectTrigger id="booking_destination_location_id" className="mt-1">
                      <SelectValue placeholder="Select destination..." />
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
                  <Label htmlFor="booking_transport_mode" className="text-xs font-semibold text-slate-700">
                    Transport Mode *
                  </Label>
                  <Select
                    value={formData.transport_mode}
                    onValueChange={(val) => setFormData({ ...formData, transport_mode: val })}
                  >
                    <SelectTrigger id="booking_transport_mode" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.transport_modes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="booking_incoterm" className="text-xs font-semibold text-slate-700">
                    Incoterm
                  </Label>
                  <Select
                    value={formData.incoterm}
                    onValueChange={(val) => setFormData({ ...formData, incoterm: val })}
                  >
                    <SelectTrigger id="booking_incoterm" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.incoterms.map((inco) => (
                        <SelectItem key={inco} value={inco}>
                          {inco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Cargo Manifest Lines */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Package size={15} className="text-blue-900" />
                  <span>Cargo Manifest Specifications</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCargoItem}
                  className="h-7 text-xs bg-white"
                >
                  <Plus size={13} className="mr-1" /> Add Cargo Line
                </Button>
              </div>

              <div className="space-y-2.5">
                {cargoItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-white p-2 shadow-2xs"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Input
                        placeholder="Cargo description"
                        value={item.description}
                        onChange={(e) => updateCargoItem(idx, "description", e.target.value)}
                        className="text-xs h-8 bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Select
                        value={item.package_type}
                        onValueChange={(val) => updateCargoItem(idx, "package_type", val)}
                      >
                        <SelectTrigger className="text-xs h-8 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.package_types.map((pkg) => (
                            <SelectItem key={pkg} value={pkg} className="text-xs">
                              {pkg.replace(/_/g, " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateCargoItem(idx, "quantity", parseInt(e.target.value) || 1)
                        }
                        className="text-xs h-8 bg-white text-right font-mono"
                        required
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Weight kg"
                        value={item.gross_weight_kg}
                        onChange={(e) =>
                          updateCargoItem(idx, "gross_weight_kg", parseFloat(e.target.value) || 0)
                        }
                        className="text-xs h-8 bg-white text-right font-mono"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      {cargoItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCargoItem(idx)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <Label htmlFor="booking_notes" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Special Handling Instructions / Notes
              </Label>
              <Textarea
                id="booking_notes"
                rows={2}
                placeholder="e.g. Keep temperature below 25C, customs inspection required at Bavet border."
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
              Confirm Booking
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
