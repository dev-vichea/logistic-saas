"use client";

import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { documentsRoot, type TradeDocument } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PushToCargoDialog({
  document,
  shipments,
  onSynced,
}: {
  document: TradeDocument;
  shipments: Array<{ id: number; shipment_number: string; transport_mode: string }>;
  onSynced: () => void;
}) {
  const { organization } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetShipmentId, setTargetShipmentId] = useState<string>(
    document.shipment_id ? document.shipment_id.toString() : (shipments[0]?.id?.toString() || "")
  );

  const itemCount = document.items?.length || 0;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !targetShipmentId) return;
    setLoading(true);
    setError(null);

    try {
      await api.post(`${documentsRoot(organization.id)}/${document.id}/push-to-cargo`, {
        shipment_id: parseInt(targetShipmentId, 10),
      });

      setOpen(false);
      onSynced();
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="shadow-2xs flex items-center gap-1.5 bg-blue-950 hover:bg-blue-900 text-white">
          <Layers className="h-4 w-4" />
          <span>Sync to Shipment Cargo Manifest</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="default" className="p-0">
        <form onSubmit={handleSync} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold text-xs">
                <Layers className="size-4" />
              </div>
              <div>
                <SheetTitle>1-Click Sync to Cargo Manifest</SheetTitle>
                <SheetDescription>
                  Transfer {itemCount} verified line items (descriptions, HS codes, quantities, and weights) directly into the operational shipment&apos;s cargo manifest.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
                <Label htmlFor="targetShipment" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Target Operational Shipment *
                </Label>
                <Select value={targetShipmentId} onValueChange={setTargetShipmentId}>
                  <SelectTrigger id="targetShipment" className="mt-1 bg-white">
                    <SelectValue placeholder="Select target shipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipments.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.shipment_number} ({s.transport_mode.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs space-y-2 text-slate-700">
                <div className="font-bold text-blue-950 uppercase tracking-wider">Transfer Summary:</div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-700 font-bold">•</span>
                  <span><strong>{itemCount} line items</strong> will be populated into Cargo Manifest</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-700 font-bold">•</span>
                  <span>English normalized descriptions, weights, and HS codes will be preserved</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-700 font-bold">•</span>
                  <span>Operational shipment status will be linked with document #{document.document_number}</span>
                </div>
              </div>
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !targetShipmentId}
              className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Confirm & Transfer Cargo"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
