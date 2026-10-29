"use client";

import { useState } from "react";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { customsRoot, type CustomsCatalog, type InspectionLane } from "@/lib/customs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface LineItemDraft {
  item_number: number;
  hs_code: string;
  description: string;
  quantity: string;
  unit_of_measure: string;
  gross_weight_kg: string;
  net_weight_kg: string;
  customs_value_usd: string;
  duty_rate_percent: string;
  is_duty_exempt: boolean;
}

export function NewDeclarationDialog({
  open,
  onOpenChange,
  catalog,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: CustomsCatalog;
  onCreated: () => void;
}) {
  const { organization, notify } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [declarationNumber, setDeclarationNumber] = useState("SAD-KHKAS-2026-004822");
  const [declarationDate, setDeclarationDate] = useState("2026-10-28");
  const [declarationType, setDeclarationType] = useState<"import" | "export" | "transit">("import");
  const [customsOfficeCode, setCustomsOfficeCode] = useState("KHKAS");
  const [regimeCode, setRegimeCode] = useState("IM 4");
  const [inspectionLane, setInspectionLane] = useState<InspectionLane>("yellow");
  const [shipmentId, setShipmentId] = useState<string>("");
  const [cdcMasterListId, setCdcMasterListId] = useState<string>("");
  const [declarantPartnerId, setDeclarantPartnerId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billOfLadingNumber, setBillOfLadingNumber] = useState("");
  const [totalPackages, setTotalPackages] = useState("1");
  const [totalGrossWeightKg, setTotalGrossWeightKg] = useState("0");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<LineItemDraft[]>([
    {
      item_number: 1,
      hs_code: "8452.29.00",
      description: "Industrial Sewing Machine and Accessories",
      quantity: "10",
      unit_of_measure: "SETS",
      gross_weight_kg: "1200",
      net_weight_kg: "1150",
      customs_value_usd: "6500",
      duty_rate_percent: "7.0",
      is_duty_exempt: true,
    },
  ]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_number: prev.length + 1,
        hs_code: "",
        description: "",
        quantity: "1",
        unit_of_measure: "PCS",
        gross_weight_kg: "0",
        net_weight_kg: "0",
        customs_value_usd: "0",
        duty_rate_percent: "7.0",
        is_duty_exempt: true,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof LineItemDraft, val: string | boolean) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        declaration_number: declarationNumber.trim(),
        declaration_date: declarationDate,
        declaration_type: declarationType,
        customs_office_code: customsOfficeCode,
        regime_code: regimeCode,
        inspection_lane: inspectionLane,
        shipment_id: shipmentId && shipmentId !== "none" ? parseInt(shipmentId) : null,
        cdc_master_list_id: cdcMasterListId && cdcMasterListId !== "none" ? parseInt(cdcMasterListId) : null,
        declarant_partner_id: declarantPartnerId && declarantPartnerId !== "none" ? parseInt(declarantPartnerId) : null,
        invoice_number: invoiceNumber.trim() || null,
        bill_of_lading_number: billOfLadingNumber.trim() || null,
        total_packages: parseInt(totalPackages) || 1,
        total_gross_weight_kg: parseFloat(totalGrossWeightKg) || 0,
        notes: notes.trim() || null,
        items: items.map((it, idx) => ({
          item_number: idx + 1,
          hs_code: it.hs_code.trim(),
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit_of_measure: it.unit_of_measure.trim() || "PCS",
          gross_weight_kg: parseFloat(it.gross_weight_kg) || 0,
          net_weight_kg: parseFloat(it.net_weight_kg) || 0,
          customs_value_usd: parseFloat(it.customs_value_usd) || 0,
          duty_rate_percent: parseFloat(it.duty_rate_percent) || 7.0,
          is_duty_exempt: it.is_duty_exempt,
        })),
      };

      await api.post(`${customsRoot(organization.id)}/declarations`, payload);
      notify("Customs declaration lodged successfully");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="2xl" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-900">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-900">
                  Lodge ASYCUDA SAD Customs Declaration
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Create a formal Single Administrative Document (SAD) with GDCE customs office, regime code, and QIP duty exemption line items.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                {error}
              </div>
            )}
          {/* Section 1: Declaration particulars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Declaration Number (SAD #)</Label>
              <Input
                value={declarationNumber}
                onChange={(e) => setDeclarationNumber(e.target.value)}
                placeholder="e.g. SAD-KHKAS-2026-004821"
                className="mt-1 font-mono text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Declaration Date</Label>
              <Input
                type="date"
                value={declarationDate}
                onChange={(e) => setDeclarationDate(e.target.value)}
                className="mt-1 text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Customs Office</Label>
              <Select value={customsOfficeCode} onValueChange={setCustomsOfficeCode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.customs_offices?.map((off) => (
                    <SelectItem key={off.code} value={off.code}>
                      {off.code} - {off.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Customs Regime</Label>
              <Select value={regimeCode} onValueChange={setRegimeCode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.regimes?.map((reg) => (
                    <SelectItem key={reg.code} value={reg.code}>
                      {reg.code} - {reg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Declaration Type</Label>
              <Select
                value={declarationType}
                onValueChange={(val) => setDeclarationType(val as "import" | "export" | "transit")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="import">Import (IM)</SelectItem>
                  <SelectItem value="export">Export (EX)</SelectItem>
                  <SelectItem value="transit">Transit (TR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Initial Inspection Lane</Label>
              <Select
                value={inspectionLane}
                onValueChange={(val) => setInspectionLane(val as InspectionLane)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green (Auto-Clearance)</SelectItem>
                  <SelectItem value="blue">Blue (Post-Clearance PCA)</SelectItem>
                  <SelectItem value="yellow">Yellow (Documentary Check)</SelectItem>
                  <SelectItem value="red">Red (Physical & Scanner)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Linkage to Shipments & CDC */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Operational & Trade Linkage
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">Linked Shipment</Label>
                <Select value={shipmentId} onValueChange={setShipmentId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="-- No Linked Shipment --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Linked Shipment --</SelectItem>
                    {catalog.shipments?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.shipment_number} ({s.transport_mode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">CDC QIP Duty-Free Master List</Label>
                <Select value={cdcMasterListId} onValueChange={setCdcMasterListId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="-- No CDC Exemption List --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No CDC Exemption List --</SelectItem>
                    {catalog.cdc_master_lists?.map((list) => (
                      <SelectItem key={list.id} value={String(list.id)}>
                        QIP {list.qip_number} - {list.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Declarant / Customs Broker</Label>
                <Select value={declarantPartnerId} onValueChange={setDeclarantPartnerId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="-- Direct Self Filing --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Direct Self Filing --</SelectItem>
                    {catalog.brokers?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. 26TKYM164"
                  className="mt-1 text-sm bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Bill of Lading (B/L) / AWB</Label>
                <Input
                  value={billOfLadingNumber}
                  onChange={(e) => setBillOfLadingNumber(e.target.value)}
                  placeholder="e.g. YS26100022-1"
                  className="mt-1 text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Packages</Label>
                  <Input
                    type="number"
                    value={totalPackages}
                    onChange={(e) => setTotalPackages(e.target.value)}
                    className="mt-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-700">Gross Wt (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalGrossWeightKg}
                    onChange={(e) => setTotalGrossWeightKg(e.target.value)}
                    className="mt-1 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Customs Declaration Line Items</h4>
                <p className="text-xs text-slate-500">
                  Itemized commodities, HS tariff codes, customs valuation, and duty exemption flags.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1 border-primary/20 text-primary hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 w-32">HS Code</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                    <th className="py-2.5 px-3 w-20">Qty</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-28">Customs Val ($)</th>
                    <th className="py-2.5 px-3 w-20">Duty %</th>
                    <th className="py-2.5 px-3 w-24 text-center">Exempt?</th>
                    <th className="py-2.5 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <Input
                          value={it.hs_code}
                          onChange={(e) => updateItem(idx, "hs_code", e.target.value)}
                          placeholder="8452.29.00"
                          className="h-7 text-xs font-mono"
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={it.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          placeholder="Commodity description"
                          className="h-7 text-xs"
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          className="h-7 text-xs"
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={it.unit_of_measure}
                          onChange={(e) => updateItem(idx, "unit_of_measure", e.target.value)}
                          placeholder="PCS"
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={it.customs_value_usd}
                          onChange={(e) => updateItem(idx, "customs_value_usd", e.target.value)}
                          className="h-7 text-xs font-mono"
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          step="0.1"
                          value={it.duty_rate_percent}
                          onChange={(e) => updateItem(idx, "duty_rate_percent", e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Checkbox
                          checked={it.is_duty_exempt}
                          onCheckedChange={(checked) => updateItem(idx, "is_duty_exempt", !!checked)}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Customs Clearance Notes & Special Remarks</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. QIP Master List duty exemption claim under Article 14 of Law on Investment."
              rows={2}
              className="mt-1 text-xs"
            />
          </div>

          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs">
              {submitting ? "Lodging..." : "Lodge Customs Declaration"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
