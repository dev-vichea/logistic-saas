"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Building2, MapPin, DollarSign } from "lucide-react";
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

interface LineItemDraft {
  description: string;
  charge_type: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export function NewQuotationDialog({
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
    quotation_number: "",
    customer_id: "",
    origin_location_id: "",
    destination_location_id: "",
    transport_mode: "ocean_fcl",
    incoterm: "FOB",
    currency: "USD",
    valid_until: "",
    terms_and_conditions: "Standard forwarder trading terms apply. Subject to carrier space and fuel surcharges.",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    {
      description: "Base Freight Charge",
      charge_type: "ocean_freight",
      quantity: 1,
      unit_price: 1850.0,
      currency: "USD",
    },
    {
      description: "Terminal Handling Charge (THC)",
      charge_type: "terminal_handling",
      quantity: 1,
      unit_price: 165.0,
      currency: "USD",
    },
    {
      description: "Customs Clearance & Documentation",
      charge_type: "customs_clearance",
      quantity: 1,
      unit_price: 120.0,
      currency: "USD",
    },
  ]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        charge_type: "trucking",
        quantity: 1,
        unit_price: 100.0,
        currency: formData.currency,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItemDraft, value: unknown) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = lineItems.reduce((acc, it) => acc + (it.quantity * it.unit_price || 0), 0);

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
        currency: formData.currency,
        items: lineItems.map((item) => ({
          description: item.description.trim() || "Freight Service",
          charge_type: item.charge_type,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          currency: item.currency || formData.currency,
        })),
      };

      if (formData.quotation_number.trim()) {
        payload.quotation_number = formData.quotation_number.trim();
      }
      if (formData.valid_until) {
        payload.valid_until = formData.valid_until;
      }
      if (formData.terms_and_conditions.trim()) {
        payload.terms_and_conditions = formData.terms_and_conditions.trim();
      }

      await api.post(`${freightRoot(organization.id)}/quotations`, payload);
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
          New Quotation
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="lg" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                QUO
              </span>
              <div>
                <SheetTitle>New Freight Quotation</SheetTitle>
                <SheetDescription>
                  Draft a multi-item pricing quotation for customer review and booking conversion.
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

            {/* Customer & Quote Reference */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Building2 size={15} className="text-blue-900" />
                <span>Customer & Reference</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_id" className="text-xs font-semibold text-slate-700">
                    Customer / Client *
                  </Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
                  >
                    <SelectTrigger id="customer_id" className="mt-1">
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
                  <Label htmlFor="quotation_number" className="text-xs font-semibold text-slate-700">
                    Quotation Reference (Optional)
                  </Label>
                  <Input
                    id="quotation_number"
                    placeholder="e.g. QUO-2026-0088"
                    value={formData.quotation_number}
                    onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
                    className="mt-1 bg-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Routing & Mode */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <MapPin size={15} className="text-blue-900" />
                <span>Route & Service Mode</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="transport_mode" className="text-xs font-semibold text-slate-700">
                    Transport Mode *
                  </Label>
                  <Select
                    value={formData.transport_mode}
                    onValueChange={(val) => setFormData({ ...formData, transport_mode: val })}
                  >
                    <SelectTrigger id="transport_mode" className="mt-1">
                      <SelectValue placeholder="Select transport mode..." />
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
                  <Label htmlFor="incoterm" className="text-xs font-semibold text-slate-700">
                    Incoterm
                  </Label>
                  <Select
                    value={formData.incoterm}
                    onValueChange={(val) => setFormData({ ...formData, incoterm: val })}
                  >
                    <SelectTrigger id="incoterm" className="mt-1">
                      <SelectValue placeholder="Select incoterm..." />
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

                <div>
                  <Label htmlFor="valid_until" className="text-xs font-semibold text-slate-700">
                    Valid Until
                  </Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Price Line Items */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <DollarSign size={15} className="text-emerald-700" />
                  <span>Itemized Price Components</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="h-7 text-xs bg-white"
                >
                  <Plus size={13} className="mr-1" /> Add Charge
                </Button>
              </div>

              <div className="space-y-2.5">
                {lineItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-white p-2 shadow-2xs"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Input
                        placeholder="Charge description (e.g. Ocean Freight)"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        className="text-xs h-8 bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Select
                        value={item.charge_type}
                        onValueChange={(val) => updateLineItem(idx, "charge_type", val)}
                      >
                        <SelectTrigger className="text-xs h-8 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ocean_freight">Ocean Freight</SelectItem>
                          <SelectItem value="air_freight">Air Freight</SelectItem>
                          <SelectItem value="trucking">Trucking</SelectItem>
                          <SelectItem value="customs_clearance">Customs</SelectItem>
                          <SelectItem value="terminal_handling">THC</SelectItem>
                          <SelectItem value="documentation">Docs</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)
                        }
                        className="text-xs h-8 bg-white text-right font-mono"
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(idx)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 border-t border-slate-200/80 text-sm font-semibold">
                  <span className="text-slate-700">Total Quotation:</span>
                  <span className="font-mono text-emerald-800 text-lg font-bold">
                    ${totalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {formData.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <Label htmlFor="terms_and_conditions" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Terms & Conditions
              </Label>
              <Textarea
                id="terms_and_conditions"
                rows={3}
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
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
              Generate Quotation
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
