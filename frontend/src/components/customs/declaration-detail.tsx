"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileCheck2,
  AlertTriangle,
  Trash2,
  RotateCw,
  MinusCircle,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { NoOrganization, Loading, ErrorBox } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  customsRoot,
  laneColor,
  declarationStatusInfo,
  type CustomsDeclaration,
  type CustomsDeclarationStatus,
  type InspectionLane,
} from "@/lib/customs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DeclarationDetail({ declarationId }: { declarationId: number }) {
  const { organization, can, notify } = useWorkspace();
  const router = useRouter();

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CustomsDeclarationStatus>("cleared");
  const [targetLane, setTargetLane] = useState<InspectionLane>("green");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const declarationRes = useResource<{ data: CustomsDeclaration }>(
    organization ? `${customsRoot(organization.id)}/declarations/${declarationId}` : null
  );

  if (!organization) return <NoOrganization />;
  if (declarationRes.error) return <ErrorBox message={declarationRes.error} />;
  if (!declarationRes.data) return <Loading />;

  const rawDec = declarationRes.data as { data?: CustomsDeclaration } | CustomsDeclaration;
  const dec: CustomsDeclaration = (rawDec && "data" in rawDec && rawDec.data ? rawDec.data : rawDec) as CustomsDeclaration;

  const laneCfg = laneColor(dec.inspection_lane);
  const stCfg = declarationStatusInfo(dec.status);

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setTransitioning(true);
    setTransitionError(null);

    try {
      await api.post(`${customsRoot(organization.id)}/declarations/${dec.id}/transition`, {
        status: targetStatus,
        inspection_lane: targetLane,
        notes: transitionNotes.trim() || null,
      });

      notify(`Declaration status updated to ${targetStatus}`);
      declarationRes.reload();
      setTransitionOpen(false);
    } catch (err) {
      setTransitionError(errorMessage(err));
    } finally {
      setTransitioning(false);
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    if (!confirm(`Are you sure you want to delete customs declaration ${dec.declaration_number}?`)) {
      return;
    }

    try {
      await api.delete(`${customsRoot(organization.id)}/declarations/${dec.id}`);
      notify("Customs declaration deleted");
      router.push("/customs");
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/customs"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {dec.declaration_number}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${stCfg?.badge || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {stCfg?.label || 'Draft'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border ${laneCfg?.badge || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${laneCfg?.border?.replace('border-', 'bg-') || 'bg-slate-400'}`} />
                {laneCfg?.label || 'Unassigned'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              General Department of Customs and Excise (GDCE) &bull; ASYCUDA World Single Administrative Document (SAD)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {can("customs.declare") && dec.status !== "released" && (
            <Button
              onClick={() => {
                setTargetStatus(dec.status === "draft" ? "lodged" : "cleared");
                setTargetLane(dec.inspection_lane);
                setTransitionNotes("");
                setTransitionOpen(true);
              }}
              className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-xs"
            >
              <RotateCw className="w-4 h-4" />
              Update Customs Status
            </Button>
          )}

          {can("customs.manage") && dec.status !== "cleared" && dec.status !== "released" && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ASYCUDA SAD Document Header Card */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-blue-300">
                Kingdom of Cambodia &bull; Ministry of Economy and Finance
              </div>
              <div className="text-lg font-bold mt-0.5">
                ASYCUDA SAD Declaration Form ({dec.declaration_type.toUpperCase()})
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase">Customs Office</span>
                <span className="font-bold text-white">{dec.customs_office_code}</span>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase">Customs Regime</span>
                <span className="font-bold text-white">{dec.regime_code}</span>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase">Filing Date</span>
                <span className="font-bold text-white">{dec.declaration_date}</span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Key Reference Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Operational Shipment</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                {dec.shipment ? (
                  <Link href={`/freight/shipments/${dec.shipment.id}`} className="text-primary hover:underline">
                    {dec.shipment.shipment_number}
                  </Link>
                ) : (
                  <span className="text-slate-400 font-sans">None linked</span>
                )}
              </div>
              {dec.shipment && (
                <div className="text-[11px] text-slate-500 mt-0.5 capitalize">
                  Mode: {dec.shipment.transport_mode.replace('_', ' ')}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Commercial Reference</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                Invoice: {dec.invoice_number || "N/A"}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                B/L / AWB: {dec.bill_of_lading_number || "N/A"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Declarant / Broker</div>
              <div className="text-sm font-semibold text-slate-900 mt-1 truncate">
                {dec.declarant_partner?.name || "Direct Filing (Self)"}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                Consignee: {dec.consignee_partner?.name || "Same as importer"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Cargo Volume & Mass</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {dec.total_packages} Packages
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Gross: {parseFloat(String(dec.total_gross_weight_kg || 0)).toLocaleString()} kg &bull; Net: {parseFloat(String(dec.total_net_weight_kg || 0)).toLocaleString()} kg
              </div>
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200">
              <div className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Customs Value (USD)</div>
              <div className="text-xl font-bold font-mono text-primary mt-1">
                ${parseFloat(String(dec.customs_value_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-700/80 mt-0.5">CIF assessable valuation</div>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <div className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">Duty Exemption (CDC)</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                ${parseFloat(String(dec.duty_exemption_amount_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">
                {dec.cdc_master_list ? `Under QIP #${dec.cdc_master_list.qip_number}` : "Exempted"}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Payable Customs Duty</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                ${parseFloat(String(dec.payable_duty_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Net duty after exemptions</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Payable VAT (10%)</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                ${parseFloat(String(dec.payable_vat_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Value added tax liability</div>
            </div>
          </div>

          {/* Notes & Special Directives */}
          {dec.notes && (
            <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                Customs Inspection & Compliance Notes:
              </div>
              <p className="whitespace-pre-line text-slate-700 font-sans">{dec.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Declaration Items Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              ASYCUDA Declaration Line Items
            </CardTitle>
            <span className="text-xs font-semibold text-slate-500">
              {dec.items?.length || 0} line items
            </span>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-3 w-10">Item #</th>
                <th className="py-2.5 px-3 w-32">HS Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Gross Wt (kg)</th>
                <th className="py-2.5 px-3 text-right">Customs Value</th>
                <th className="py-2.5 px-3 text-right">Tariff %</th>
                <th className="py-2.5 px-3 text-right">Duty Exemption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dec.items && dec.items.length > 0 ? (
                dec.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-500">{it.item_number}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{it.hs_code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {it.description}
                      {it.cdc_master_item && (
                        <div className="text-[11px] text-indigo-600 font-normal mt-0.5">
                          Linked QIP Item #{it.cdc_master_item.item_number} ({it.cdc_master_item.description_english})
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {parseFloat(String(it.quantity)).toLocaleString()} <span className="text-slate-500 text-[10px]">{it.unit_of_measure}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {parseFloat(String(it.gross_weight_kg || 0)).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      ${parseFloat(String(it.customs_value_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {it.duty_rate_percent}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {it.is_duty_exempt ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          -${parseFloat(String(it.exempt_amount_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })} (100% Exemption)
                        </span>
                      ) : (
                        <span className="text-slate-400">Payable</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No items attached to this declaration yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Linked CDC Quota Deductions Table */}
      {dec.deductions && dec.deductions.length > 0 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-indigo-600" />
              Executed CDC Quota Cut-Stock Deductions
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Cut-Stock Ref</th>
                  <th className="py-2.5 px-3">CDC Master Item</th>
                  <th className="py-2.5 px-3 text-right">Deducted Qty</th>
                  <th className="py-2.5 px-3 text-right">Balance Before</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                  <th className="py-2.5 px-3">Deducted Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dec.deductions.map((ded) => (
                  <tr key={ded.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                      {ded.deduction_reference}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {ded.cdc_master_item?.description_english || "CDC Item"}
                      <span className="text-[11px] text-slate-500 block font-mono">
                        HS: {ded.cdc_master_item?.hs_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {parseFloat(String(ded.deducted_quantity)).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {parseFloat(String(ded.balance_before)).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {parseFloat(String(ded.balance_after)).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(ded.deducted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Status Transition Sheet */}
      <Sheet open={transitionOpen} onOpenChange={setTransitionOpen}>
        <SheetContent side="right" size="default" className="p-0">
          <form onSubmit={handleTransition} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle className="text-base font-bold text-slate-900">
                Update Customs Clearance Status
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Transition the ASYCUDA SAD declaration state and record GDCE inspection outcome.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {transitionError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  {transitionError}
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-slate-700">New Clearance Status</Label>
                <Select
                  value={targetStatus}
                  onValueChange={(val) => setTargetStatus(val as CustomsDeclarationStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft Declaration</SelectItem>
                    <SelectItem value="cdc_deducted">CDC Quota Deducted</SelectItem>
                    <SelectItem value="lodged">Lodged in ASYCUDA World</SelectItem>
                    <SelectItem value="under_inspection">Under Customs Inspection</SelectItem>
                    <SelectItem value="cleared">Customs Cleared & Tax Exempted</SelectItem>
                    <SelectItem value="released">Gate Release Order Issued</SelectItem>
                    <SelectItem value="rejected">Rejected / Disputed by Customs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Inspection Lane Assignment</Label>
                <Select
                  value={targetLane}
                  onValueChange={(val) => setTargetLane(val as InspectionLane)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Green Lane (Direct Fast-Track Release)</SelectItem>
                    <SelectItem value="blue">Blue Lane (Post-Clearance Audit / PCA)</SelectItem>
                    <SelectItem value="yellow">Yellow Lane (Documentary Tariff Scrutiny)</SelectItem>
                    <SelectItem value="red">Red Lane (Physical Inspection & X-Ray Scan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Clearance Remarks & Inspection Audit Note</Label>
                <Textarea
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="e.g. Passed physical scanner inspection without discrepancy; release slip issued."
                  rows={3}
                  className="mt-1 text-xs bg-white"
                />
              </div>
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransitionOpen(false)}
                disabled={transitioning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transitioning}
                className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
              >
                {transitioning ? "Saving..." : "Confirm Status Transition"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
