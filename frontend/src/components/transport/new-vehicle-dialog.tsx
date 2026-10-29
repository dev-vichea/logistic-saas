"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Truck, Weight } from "lucide-react";
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
import { transportRoot, type TransportationCatalog } from "@/lib/transportation";

export function NewVehicleDialog({
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
    plate_number: "",
    type: "rigid_truck",
    ownership_type: "owned",
    make_model: "",
    year: new Date().getFullYear(),
    max_payload_kg: 15000,
    volume_capacity_cbm: 40.0,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      await api.post(`${transportRoot(organization.id)}/vehicles`, {
        plate_number: formData.plate_number.trim(),
        type: formData.type,
        ownership_type: formData.ownership_type,
        make_model: formData.make_model.trim(),
        year: Number(formData.year) || undefined,
        max_payload_kg: Number(formData.max_payload_kg),
        volume_capacity_cbm: Number(formData.volume_capacity_cbm) || undefined,
        notes: formData.notes.trim() || undefined,
      });

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
        <Button className="h-9 gap-1.5 shadow-2xs">
          <Plus size={16} />
          <span>Add Fleet Vehicle</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="default" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                VEH
              </span>
              <div>
                <SheetTitle>Register Fleet Vehicle / Equipment</SheetTitle>
                <SheetDescription>
                  Add a company truck, prime mover, container chassis, or subcontracted transport asset.
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

            {/* Vehicle Identification */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Truck size={15} className="text-blue-900" />
                <span>Vehicle Identification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plate_number" className="text-xs font-semibold text-slate-700">
                    License Plate Number *
                  </Label>
                  <Input
                    id="plate_number"
                    required
                    placeholder="e.g. 3A-8899 / PP-2B-1234"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    className="mt-1 bg-white font-mono uppercase text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="make_model" className="text-xs font-semibold text-slate-700">
                    Make & Model *
                  </Label>
                  <Input
                    id="make_model"
                    required
                    placeholder="e.g. Hino 500 15T / Scania G410"
                    value={formData.make_model}
                    onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle_type" className="text-xs font-semibold text-slate-700">
                    Vehicle / Asset Type *
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger id="vehicle_type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.vehicle_types.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ownership_type" className="text-xs font-semibold text-slate-700">
                    Ownership Model *
                  </Label>
                  <Select
                    value={formData.ownership_type}
                    onValueChange={(val) => setFormData({ ...formData, ownership_type: val })}
                  >
                    <SelectTrigger id="ownership_type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.ownership_types.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Capacity & Specs */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Weight size={15} className="text-blue-900" />
                <span>Payload & Dimension Limits</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="max_payload_kg" className="text-xs font-semibold text-slate-700">
                    Payload (KG) *
                  </Label>
                  <Input
                    id="max_payload_kg"
                    required
                    type="number"
                    min="0"
                    value={formData.max_payload_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, max_payload_kg: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 bg-white text-sm font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="volume_capacity_cbm" className="text-xs font-semibold text-slate-700">
                    Volume (CBM)
                  </Label>
                  <Input
                    id="volume_capacity_cbm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.volume_capacity_cbm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        volume_capacity_cbm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white text-sm font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="year" className="text-xs font-semibold text-slate-700">
                    Manufacturing Year
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    min="1980"
                    max="2050"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) || 2026 })
                    }
                    className="mt-1 bg-white text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Fleet Notes & Maintenance Remarks
              </Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="e.g. Equipped with GPS tracker, GPS Unit ID #88921, speed limiter calibrated."
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
              Register Vehicle
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
