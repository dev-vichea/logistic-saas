"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Bookmark,
  Building2,
  MapPin,
  Package,
  FileCheck,
  FileText,
  Map as MapIcon,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkspaceDrawer,
  WorkspaceDraftTabs,
  WorkspaceBody,
  WorkspaceCard,
  WorkspaceDocumentAssistant,
  type AssistantDocItem,
} from "@/components/workspace-drawer";
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

interface BookingDraft {
  id: string;
  label: string;
  booking_number: string;
  customer_reference: string;
  customer_id: string;
  origin_location_id: string;
  destination_location_id: string;
  transport_mode: string;
  incoterm: string;
  total_amount: number;
  currency: string;
  notes: string;
  cargoItems: CargoItemDraft[];
  documents: AssistantDocItem[];
}

function createInitialDraft(index = 1): BookingDraft {
  return {
    id: `draft-${Date.now()}-${index}`,
    label: `Booking #${index}`,
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
    cargoItems: [
      {
        description: "Apparel and textile garment cartons",
        package_type: "cartons",
        quantity: 500,
        gross_weight_kg: 4200,
        volume_cbm: 24.5,
      },
    ],
    documents: [],
  };
}

export function NewBookingDialog({
  catalog,
  onCreated,
}: {
  catalog: FreightCatalog;
  onCreated?: () => void;
}) {
  const { organization, notify } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft management
  const [drafts, setDrafts] = useState<BookingDraft[]>([createInitialDraft(1)]);
  const [activeDraftId, setActiveDraftId] = useState<string>(drafts[0].id);

  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0];

  const updateActiveDraft = (updater: (prev: BookingDraft) => BookingDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === activeDraft.id ? updater(d) : d)));
  };

  const addDraftTab = () => {
    const nextIdx = drafts.length + 1;
    const newDraft = createInitialDraft(nextIdx);
    setDrafts((prev) => [...prev, newDraft]);
    setActiveDraftId(newDraft.id);
  };

  const closeDraftTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (drafts.length <= 1) return;
    const filtered = drafts.filter((d) => d.id !== id);
    setDrafts(filtered);
    if (activeDraftId === id) {
      setActiveDraftId(filtered[0].id);
    }
  };

  const partnersRes = useResource<{ data: Partner[] }>(
    organization && open ? `${partnerRoot(organization.id)}?per_page=100` : null
  );

  const partners = partnersRes.data?.data || [];
  const customers = partners.filter((p) => p.roles.includes("customer") || p.roles.includes("shipper"));

  const addCargoItem = () => {
    updateActiveDraft((prev) => ({
      ...prev,
      cargoItems: [
        ...prev.cargoItems,
        {
          description: "",
          package_type: "cartons",
          quantity: 10,
          gross_weight_kg: 100,
          volume_cbm: 1.0,
        },
      ],
    }));
  };

  const removeCargoItem = (index: number) => {
    if (activeDraft.cargoItems.length === 1) return;
    updateActiveDraft((prev) => ({
      ...prev,
      cargoItems: prev.cargoItems.filter((_, i) => i !== index),
    }));
  };

  const updateCargoItem = (index: number, field: keyof CargoItemDraft, value: string | number) => {
    updateActiveDraft((prev) => ({
      ...prev,
      cargoItems: prev.cargoItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        customer_id: Number(activeDraft.customer_id),
        origin_location_id: Number(activeDraft.origin_location_id),
        destination_location_id: Number(activeDraft.destination_location_id),
        transport_mode: activeDraft.transport_mode,
        incoterm: activeDraft.incoterm,
        total_amount: Number(activeDraft.total_amount) || 0,
        currency: activeDraft.currency,
        items: activeDraft.cargoItems.map((item) => ({
          description: item.description.trim() || "Cargo Line",
          package_type: item.package_type,
          quantity: Number(item.quantity) || 1,
          gross_weight_kg: Number(item.gross_weight_kg) || 0,
          volume_cbm: Number(item.volume_cbm) || 0,
        })),
      };

      if (activeDraft.booking_number.trim()) payload.booking_number = activeDraft.booking_number.trim();
      if (activeDraft.customer_reference.trim()) payload.customer_reference = activeDraft.customer_reference.trim();
      if (activeDraft.notes.trim()) payload.notes = activeDraft.notes.trim();

      await api.post(`${freightRoot(organization.id)}/bookings`, payload);
      setOpen(false);
      notify("Freight booking created successfully.");
      if (onCreated) {
        onCreated();
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(errorMessage(err) || "Failed to create booking.");
    } finally {
      setSaving(false);
    }
  };

  // Document Assistant handlers
  const handleUploadDocs = (files: FileList) => {
    const newDocs: AssistantDocItem[] = Array.from(files).map((f) => ({
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      url: URL.createObjectURL(f),
      type: "uploaded",
    }));
    updateActiveDraft((prev) => ({
      ...prev,
      documents: [...prev.documents, ...newDocs],
    }));
    notify(`${files.length} document(s) uploaded.`);
  };

  const handleLoadSample = () => {
    const sampleDoc: AssistantDocItem = {
      id: "sample-bkg-bl",
      name: "TRADE_BOOKING_PACKING_LIST.pdf",
      url: "sample",
      isSample: true,
      extracted: {
        confidence: 96,
        fields: {
          customer: "EuroRetail Logistics BV",
          po_number: "PO-2026-EUR-991",
          cargo: "Textiles & Cotton Garments",
          gross_weight: "4,200 KG",
        },
      },
    };
    updateActiveDraft((prev) => ({
      ...prev,
      documents: [sampleDoc, ...prev.documents],
    }));
    notify("Sample packing list document loaded.");
  };

  const originName =
    catalog.locations.find((l) => String(l.id) === activeDraft.origin_location_id)?.name || "Origin";
  const destName =
    catalog.locations.find((l) => String(l.id) === activeDraft.destination_location_id)?.name || "Destination";

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 shadow-2xs">
        <Plus size={16} />
        New Booking
      </Button>

      {open && (
        <WorkspaceDrawer
          open={open}
          onOpenChange={setOpen}
          title="New Freight Booking"
          ariaLabel="New Freight Booking"
          description="Create an operational booking reservation with cargo manifest line items."
          size="4/5"
          headerTabs={
            <WorkspaceDraftTabs
              tabs={drafts.map((d) => {
                const orig =
                  catalog.locations.find((l) => String(l.id) === d.origin_location_id)?.city || "Origin";
                const dest =
                  catalog.locations.find((l) => String(l.id) === d.destination_location_id)?.city || "Destination";
                return {
                  id: d.id,
                  label: d.label,
                  subtitle: `${orig} → ${dest}`,
                  active: d.id === activeDraft.id,
                };
              })}
              onSelectTab={setActiveDraftId}
              onCloseTab={closeDraftTab}
              onAddTab={addDraftTab}
              addTabTooltip="Add another booking draft"
            />
          }
          headerActions={
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => notify("Booking draft saved to local workspace.")}
                className="h-8 gap-1.5 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                <FileCheck size={13} className="text-slate-500" />
                <span>Save Draft</span>
              </Button>

              <Button
                size="sm"
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving || !activeDraft.customer_id || !activeDraft.origin_location_id || !activeDraft.destination_location_id}
                className="h-8 gap-1.5 px-3.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
              >
                {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : <Bookmark size={13} />}
                <span>Confirm Booking</span>
              </Button>
            </>
          }
        >
          {error && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <WorkspaceBody variant="split">
            {/* LEFT PANEL (62%): Scrollable Form Cards */}
            <div className="h-full overflow-y-auto custom-scrollbar bg-[#F5F6F8] p-3 sm:p-4 space-y-3">
              {/* Card 1: References & Identifiers */}
              <WorkspaceCard
                icon={Bookmark}
                iconBg="bg-blue-50 text-blue-600"
                title="Booking & Customer Identifiers"
                subtitle="Operational identifiers and contract references"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="booking_number" className="text-[11px] font-medium text-slate-600">
                      Booking # (Optional)
                    </Label>
                    <Input
                      id="booking_number"
                      placeholder="Auto-generated e.g. BKG-2026-0034"
                      value={activeDraft.booking_number}
                      onChange={(e) => updateActiveDraft((prev) => ({ ...prev, booking_number: e.target.value }))}
                      className="mt-1 h-[38px] bg-white text-xs font-mono placeholder:font-sans placeholder:normal-case"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_reference" className="text-[11px] font-medium text-slate-600">
                      Customer PO / Reference #
                    </Label>
                    <Input
                      id="customer_reference"
                      placeholder="e.g. PO-889104-KH"
                      value={activeDraft.customer_reference}
                      onChange={(e) => updateActiveDraft((prev) => ({ ...prev, customer_reference: e.target.value }))}
                      className="mt-1 h-[38px] bg-white text-xs font-mono placeholder:font-sans placeholder:normal-case"
                    />
                  </div>
                </div>
              </WorkspaceCard>

              {/* Card 2: Customer & Total Freight */}
              <WorkspaceCard
                icon={Building2}
                iconBg="bg-emerald-50 text-emerald-600"
                title="Customer & Agreed Freight Total"
                subtitle="Commercial client and billing arrangement"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="booking_customer_id" className="text-[11px] font-medium text-slate-600">
                      Customer / Shipper *
                    </Label>
                    <Select
                      value={activeDraft.customer_id}
                      onValueChange={(val) => updateActiveDraft((prev) => ({ ...prev, customer_id: val }))}
                    >
                      <SelectTrigger id="booking_customer_id" className="mt-1 h-[38px] bg-white text-xs">
                        <SelectValue placeholder="Select customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                            {c.name} ({c.country_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="total_amount" className="text-[11px] font-medium text-slate-600">
                      Agreed Freight Total ({activeDraft.currency})
                    </Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={activeDraft.total_amount}
                      onChange={(e) =>
                        updateActiveDraft((prev) => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))
                      }
                      className="mt-1 h-[38px] bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </WorkspaceCard>

              {/* Card 3: Routing Facilities & Mode */}
              <WorkspaceCard
                icon={MapPin}
                iconBg="bg-amber-50 text-amber-600"
                title="Routing Facilities & Mode"
                subtitle="Hub locations, transport mode, and delivery terms"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="booking_origin_location_id" className="text-[11px] font-medium text-slate-600">
                      Origin Facility *
                    </Label>
                    <Select
                      value={activeDraft.origin_location_id}
                      onValueChange={(val) => updateActiveDraft((prev) => ({ ...prev, origin_location_id: val }))}
                    >
                      <SelectTrigger id="booking_origin_location_id" className="mt-1 h-[38px] bg-white text-xs">
                        <SelectValue placeholder="Select origin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.locations.map((loc) => (
                          <SelectItem key={loc.id} value={String(loc.id)} className="text-xs">
                            {loc.name} ({loc.city}, {loc.country_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="booking_destination_location_id" className="text-[11px] font-medium text-slate-600">
                      Destination Facility *
                    </Label>
                    <Select
                      value={activeDraft.destination_location_id}
                      onValueChange={(val) =>
                        updateActiveDraft((prev) => ({ ...prev, destination_location_id: val }))
                      }
                    >
                      <SelectTrigger id="booking_destination_location_id" className="mt-1 h-[38px] bg-white text-xs">
                        <SelectValue placeholder="Select destination..." />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.locations.map((loc) => (
                          <SelectItem key={loc.id} value={String(loc.id)} className="text-xs">
                            {loc.name} ({loc.city}, {loc.country_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <Label htmlFor="booking_transport_mode" className="text-[11px] font-medium text-slate-600">
                      Transport Mode *
                    </Label>
                    <Select
                      value={activeDraft.transport_mode}
                      onValueChange={(val) => updateActiveDraft((prev) => ({ ...prev, transport_mode: val }))}
                    >
                      <SelectTrigger id="booking_transport_mode" className="mt-1 h-[38px] bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.transport_modes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value} className="text-xs">
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="booking_incoterm" className="text-[11px] font-medium text-slate-600">
                      Incoterm
                    </Label>
                    <Select
                      value={activeDraft.incoterm}
                      onValueChange={(val) => updateActiveDraft((prev) => ({ ...prev, incoterm: val }))}
                    >
                      <SelectTrigger id="booking_incoterm" className="mt-1 h-[38px] bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.incoterms.map((inco) => (
                          <SelectItem key={inco} value={inco} className="text-xs">
                            {inco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </WorkspaceCard>

              {/* Card 4: Cargo Manifest Specifications */}
              <WorkspaceCard
                icon={Package}
                iconBg="bg-purple-50 text-purple-600"
                title="Cargo Manifest Specifications"
                subtitle="Consignment line items, packages, and dimensions"
                action={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addCargoItem}
                    className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5"
                  >
                    <Plus size={12} className="mr-1" /> Add Cargo Line
                  </Button>
                }
              >
                <div className="space-y-2">
                  {activeDraft.cargoItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <Label className="text-[10px] text-slate-500">Description</Label>
                        <Input
                          placeholder="Cargo description"
                          value={item.description}
                          onChange={(e) => updateCargoItem(idx, "description", e.target.value)}
                          className="mt-0.5 text-xs h-8 bg-white"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-[10px] text-slate-500">Package</Label>
                        <Select
                          value={item.package_type}
                          onValueChange={(val) => updateCargoItem(idx, "package_type", val)}
                        >
                          <SelectTrigger className="mt-0.5 text-xs h-8 bg-white">
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
                        <Label className="text-[10px] text-slate-500">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCargoItem(idx, "quantity", parseInt(e.target.value) || 1)
                          }
                          className="mt-0.5 text-xs h-8 bg-white text-right font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Label className="text-[10px] text-slate-500">Gross Wt (KG)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.gross_weight_kg}
                          onChange={(e) =>
                            updateCargoItem(idx, "gross_weight_kg", parseFloat(e.target.value) || 0)
                          }
                          className="mt-0.5 text-xs h-8 bg-white text-right font-mono"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end items-end pt-3">
                        {activeDraft.cargoItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCargoItem(idx)}
                            className="size-7 p-0 text-slate-400 hover:text-red-600"
                            title="Remove line"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </WorkspaceCard>

              {/* Card 5: Notes & Special Instructions */}
              <WorkspaceCard
                icon={FileText}
                iconBg="bg-slate-100 text-slate-600"
                title="Special Instructions & Handling Notes"
              >
                <div>
                  <Textarea
                    id="booking_notes"
                    rows={2}
                    placeholder="e.g. Keep temperature below 25C, customs inspection required at Bavet border."
                    value={activeDraft.notes}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, notes: e.target.value }))}
                    className="bg-white text-xs"
                  />
                </div>
              </WorkspaceCard>
            </div>

            {/* RIGHT PANEL (38%): Reusable Document Assistant & Route Map */}
            <WorkspaceDocumentAssistant
              documents={activeDraft.documents}
              activeDocId={activeDraft.documents[0]?.id}
              onSelectDoc={(id) => {
                const found = activeDraft.documents.find((d) => d.id === id);
                if (found) {
                  updateActiveDraft((prev) => ({
                    ...prev,
                    documents: [found, ...prev.documents.filter((d) => d.id !== id)],
                  }));
                }
              }}
              onUpload={handleUploadDocs}
              onRemove={(id) => {
                updateActiveDraft((prev) => ({
                  ...prev,
                  documents: prev.documents.filter((d) => d.id !== id),
                }));
              }}
              onLoadSample={handleLoadSample}
              sampleDocLabel="Load Sample Packing List"
              sampleDocumentPreview={
                <div className="w-full max-w-sm bg-white shadow-lg border border-slate-300 p-5 text-slate-900 font-mono text-xs">
                  <div className="border-b-2 border-slate-900 pb-2 text-center">
                    <h3 className="text-xs font-bold">COMMERCIAL PACKING LIST</h3>
                    <p className="text-[10px] text-slate-600">EXPORT CONSIGNMENT SPECIFICATION</p>
                  </div>
                  <div className="py-2 text-[10px] space-y-1">
                    <p><span className="text-slate-500">SHIPPER:</span> WEALDONE LIMITED</p>
                    <p><span className="text-slate-500">CLIENT:</span> EURORETAIL LOGISTICS BV</p>
                    <p><span className="text-slate-500">PACKAGES:</span> 500 CARTONS</p>
                    <p><span className="text-slate-500">GROSS WEIGHT:</span> 4,200 KG</p>
                  </div>
                </div>
              }
              mapTabContent={
                <div className="p-4 space-y-3 bg-slate-50 flex-1">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <MapIcon size={15} className="text-blue-600" />
                        <h4 className="text-xs font-semibold text-slate-900">Corridor Route Preview</h4>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                        {originName} → {destName}
                      </Badge>
                    </div>
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Route active between <span className="font-semibold text-slate-800">{originName}</span> and{" "}
                      <span className="font-semibold text-slate-800">{destName}</span>.
                    </div>
                  </div>
                </div>
              }
              mapTabBadge="Route"
            />
          </WorkspaceBody>
        </WorkspaceDrawer>
      )}
    </>
  );
}
