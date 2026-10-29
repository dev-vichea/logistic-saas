"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Package, AlertTriangle, FileSignature } from "lucide-react";
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
import { transportRoot, type DispatchTrip } from "@/lib/transportation";

export function PodModal({
  trip,
  onDelivered,
}: {
  trip: DispatchTrip;
  onDelivered: () => void;
}) {
  const { organization } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const legs = trip.trip_legs || [];
  const primaryShipmentId = legs[0]?.shipment_leg?.shipment_id || 0;

  const [formData, setFormData] = useState({
    shipment_id: primaryShipmentId ? String(primaryShipmentId) : "",
    recipient_name: "",
    recipient_phone: "",
    received_packages: 100,
    damaged_packages: 0,
    discrepancy_notes: "",
    signatory_remarks: "Received in good order and full condition.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSubmitting(true);

    try {
      await api.post(`${transportRoot(organization.id)}/trips/${trip.id}/pod`, {
        shipment_id: Number(formData.shipment_id) || primaryShipmentId,
        recipient_name: formData.recipient_name.trim(),
        recipient_phone: formData.recipient_phone.trim() || undefined,
        received_packages: Number(formData.received_packages),
        damaged_packages: Number(formData.damaged_packages),
        discrepancy_notes: formData.discrepancy_notes.trim() || undefined,
        signatory_remarks: formData.signatory_remarks.trim() || undefined,
      });

      setOpen(false);
      onDelivered();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-2xs">
          <CheckCircle2 size={14} />
          <span>Record Signed POD</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="default" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                POD
              </span>
              <div>
                <SheetTitle>Proof of Delivery (POD) Confirmation</SheetTitle>
                <SheetDescription>
                  Record consignee signature, recipient identity, package reconciliation, and complete run-sheet.
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

            {legs.length > 1 && (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
                <Label htmlFor="pod_shipment_id" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Delivered Shipment
                </Label>
                <Select
                  value={formData.shipment_id}
                  onValueChange={(val) => setFormData({ ...formData, shipment_id: val })}
                >
                  <SelectTrigger id="pod_shipment_id" className="mt-1">
                    <SelectValue placeholder="Select shipment delivered..." />
                  </SelectTrigger>
                  <SelectContent>
                    {legs.map((tl) => (
                      <SelectItem
                        key={tl.id}
                        value={String(tl.shipment_leg?.shipment_id || "")}
                      >
                        Shipment #{tl.shipment_leg?.shipment_id} (Leg #{tl.sequence})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Consignee Signatory */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileSignature size={15} className="text-blue-900" />
                <span>Consignee Signatory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_name" className="text-xs font-semibold text-slate-700">
                    Recipient / Signatory Name *
                  </Label>
                  <Input
                    id="recipient_name"
                    required
                    placeholder="e.g. Vannak Heng (Warehouse Receiving)"
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="recipient_phone" className="text-xs font-semibold text-slate-700">
                    Recipient Contact Phone
                  </Label>
                  <Input
                    id="recipient_phone"
                    placeholder="e.g. +855 12 889 900"
                    value={formData.recipient_phone}
                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Cargo Count Reconciliation */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Package size={15} className="text-blue-900" />
                <span>Package Count & Tally</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="received_packages" className="text-xs font-semibold text-slate-700">
                    Received Packages *
                  </Label>
                  <Input
                    id="received_packages"
                    required
                    type="number"
                    min="0"
                    value={formData.received_packages}
                    onChange={(e) =>
                      setFormData({ ...formData, received_packages: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 bg-white font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="damaged_packages" className="text-xs font-semibold text-slate-700">
                    Damaged / Shortage Packages
                  </Label>
                  <Input
                    id="damaged_packages"
                    type="number"
                    min="0"
                    value={formData.damaged_packages}
                    onChange={(e) =>
                      setFormData({ ...formData, damaged_packages: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 bg-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-3">
              <div>
                <Label htmlFor="signatory_remarks" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Delivery Remarks / Consignee Notes
                </Label>
                <Textarea
                  id="signatory_remarks"
                  rows={2}
                  value={formData.signatory_remarks}
                  onChange={(e) => setFormData({ ...formData, signatory_remarks: e.target.value })}
                  className="mt-1 bg-white text-xs"
                />
              </div>

              {Number(formData.damaged_packages) > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertTriangle size={14} />
                    <span>Discrepancy & Damage Report *</span>
                  </div>
                  <Textarea
                    id="discrepancy_notes"
                    rows={2}
                    required
                    placeholder="Describe package damage, crushed boxes, or missing items..."
                    value={formData.discrepancy_notes}
                    onChange={(e) => setFormData({ ...formData, discrepancy_notes: e.target.value })}
                    className="bg-white text-xs border-rose-300"
                  />
                </div>
              )}
            </div>
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-2xs"
            >
              {submitting ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
              Confirm POD Delivery
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
