"use client";

import { useState } from "react";
import { Loader2, Send, Gauge } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { api, errorMessage } from "@/lib/api";
import { transportRoot, type DispatchTrip } from "@/lib/transportation";

export function DispatchModal({
  trip,
  onDispatched,
}: {
  trip: DispatchTrip;
  onDispatched: () => void;
}) {
  const { organization } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [odometer, setOdometer] = useState<string>(
    trip.odometer_start_km ? String(trip.odometer_start_km) : ""
  );
  const [containerNumber, setContainerNumber] = useState<string>(trip.container_number || "");
  const [sealNumber, setSealNumber] = useState<string>(trip.seal_number || "");

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSubmitting(true);

    try {
      await api.post(`${transportRoot(organization.id)}/trips/${trip.id}/dispatch`, {
        odometer_start_km: odometer ? parseFloat(odometer) : undefined,
        container_number: containerNumber.trim() || undefined,
        seal_number: sealNumber.trim() || undefined,
      });

      setOpen(false);
      onDispatched();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs">
          <Send size={14} />
          <span>Dispatch Truck</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="default" className="p-0">
        <form onSubmit={handleDispatch} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                DSP
              </span>
              <div>
                <SheetTitle>Dispatch Run-Sheet: {trip.trip_number}</SheetTitle>
                <SheetDescription>
                  Confirm vehicle departure. Transitions assigned truck, driver, and shipment cargo legs to In Transit.
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

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Gauge size={15} className="text-blue-900" />
                <span>Odometer & Seal Verification</span>
              </div>

              <div>
                <Label htmlFor="dispatch_odometer" className="text-xs font-semibold text-slate-700">
                  Departure Odometer (KM)
                </Label>
                <Input
                  id="dispatch_odometer"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 124500.5"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="mt-1 bg-white font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dispatch_container" className="text-xs font-semibold text-slate-700">
                    Container Number
                  </Label>
                  <Input
                    id="dispatch_container"
                    placeholder="e.g. MSCU-992182-1"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value)}
                    className="mt-1 bg-white font-mono uppercase text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="dispatch_seal" className="text-xs font-semibold text-slate-700">
                    Seal Number
                  </Label>
                  <Input
                    id="dispatch_seal"
                    placeholder="e.g. SL-889128"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    className="mt-1 bg-white font-mono uppercase text-xs"
                  />
                </div>
              </div>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
            >
              {submitting ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
              Confirm Departure
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
