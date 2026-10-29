"use client";

import { useState } from "react";
import { Scale, Loader2, Sparkles, FileText } from "lucide-react";
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

export function NewReconciliationDialog({
  invoices,
  packingLists,
  onCreated,
}: {
  invoices: TradeDocument[];
  packingLists: TradeDocument[];
  onCreated: (reconciliationId: number) => void;
}) {
  const { organization } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invoiceId, setInvoiceId] = useState<string>(invoices[0]?.id?.toString() || "");
  const [packingId, setPackingId] = useState<string>(packingLists[0]?.id?.toString() || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !invoiceId || !packingId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<{ id: number }>(`${documentsRoot(organization.id)}/reconciliations`, {
        invoice_document_id: parseInt(invoiceId, 10),
        packing_list_document_id: parseInt(packingId, 10),
      });

      setOpen(false);
      onCreated(res.data.id);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-blue-950 hover:bg-blue-900 text-white shadow-2xs flex items-center gap-1.5">
          <Scale className="h-4 w-4" />
          <span>New Cross-Reconciliation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="default" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs">
                <Scale className="size-4" />
              </div>
              <div>
                <SheetTitle>Cross-Document Reconciliation</SheetTitle>
                <SheetDescription>
                  Pair a Commercial Invoice with a Packing List to run automated 5-tier candidate matching, detect item variances, and check totals.
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

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileText size={15} className="text-blue-900" />
                <span>Source Document Pair</span>
              </div>

              <div>
                <Label htmlFor="invoice" className="text-xs font-semibold text-slate-700">
                  Select Commercial Invoice (CI) *
                </Label>
                <Select value={invoiceId} onValueChange={setInvoiceId}>
                  <SelectTrigger id="invoice" className="mt-1 bg-white">
                    <SelectValue placeholder="Select Commercial Invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id.toString()}>
                        {inv.document_number || `INV #${inv.id}`} ({inv.file_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="packing" className="text-xs font-semibold text-slate-700">
                  Select Packing List (PL) *
                </Label>
                <Select value={packingId} onValueChange={setPackingId}>
                  <SelectTrigger id="packing" className="mt-1 bg-white">
                    <SelectValue placeholder="Select Packing List" />
                  </SelectTrigger>
                  <SelectContent>
                    {packingLists.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id.toString()}>
                        {pl.document_number || `PL #${pl.id}`} ({pl.file_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs space-y-2 text-slate-700">
              <div className="font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-blue-700" />
                <span>Automated 5-Tier Checks Performed:</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-bold">•</span>
                <span>1-to-1 description & Chinese trade term pairing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-bold">•</span>
                <span>HS classification & unit-of-measure validation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-bold">•</span>
                <span>Quantity variance & missing packing line detection</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-bold">•</span>
                <span>Gross weight, net weight & package count totals verification</span>
              </div>
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !invoiceId || !packingId}
              className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Run Cross-Reconciliation"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
