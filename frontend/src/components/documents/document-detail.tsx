"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  ArrowLeft,
  Edit2,
  Sparkles,
  Building,
  Loader2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { NoOrganization, Loading, ErrorBox } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  documentsRoot,
  documentTypeLabel,
  type TradeDocument,
  type TradeDocumentItem,
  type DocumentCatalog,
} from "@/lib/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { PushToCargoDialog } from "./push-to-cargo-dialog";

export function DocumentDetail({ documentId }: { documentId: string }) {
  const { organization, can } = useWorkspace();
  const [editingItem, setEditingItem] = useState<TradeDocumentItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const [editDesc, setEditDesc] = useState("");
  const [editHs, setEditHs] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editWeight, setEditWeight] = useState("");

  const docRes = useResource<TradeDocument>(
    organization ? `${documentsRoot(organization.id)}/${documentId}` : null
  );

  const catalogRes = useResource<{ data: DocumentCatalog }>(
    organization ? `${documentsRoot(organization.id)}/catalog` : null
  );

  if (!organization) return <NoOrganization />;
  if (docRes.error) return <ErrorBox message={docRes.error} />;
  if (!docRes.data) return <Loading />;

  const rawDoc = docRes.data as { data?: TradeDocument } | TradeDocument | undefined;
  const doc = (rawDoc && "data" in rawDoc && rawDoc.data ? rawDoc.data : rawDoc) as TradeDocument;
  const items = doc.items || [];
  const rawCatalog = catalogRes.data as { data?: DocumentCatalog } | DocumentCatalog | undefined;
  const catalog = (rawCatalog && "data" in rawCatalog && rawCatalog.data ? rawCatalog.data : rawCatalog) as DocumentCatalog | undefined;
  const shipments = catalog?.shipments || [];

  const handleVerify = async () => {
    if (!confirm("Confirm and mark this document as verified?")) return;
    try {
      await api.post(`${documentsRoot(organization.id)}/${doc.id}/verify`);
      docRes.reload();
    } catch (err: unknown) {
      alert(errorMessage(err));
    }
  };

  const openEditModal = (item: TradeDocumentItem) => {
    setEditingItem(item);
    setEditDesc(item.description_english || "");
    setEditHs(item.hs_code || "");
    setEditQty(item.quantity ? item.quantity.toString() : "1");
    setEditUnit(item.unit_of_measure || "PCS");
    setEditPrice(item.unit_price ? item.unit_price.toString() : "");
    setEditWeight(item.gross_weight_kg ? item.gross_weight_kg.toString() : "");
    setItemError(null);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !organization) return;
    setSavingItem(true);
    setItemError(null);

    try {
      await api.patch(
        `${documentsRoot(organization.id)}/${doc.id}/items/${editingItem.id}`,
        {
          description_english: editDesc.trim(),
          hs_code: editHs.trim() || null,
          quantity: parseFloat(editQty) || 1,
          unit_of_measure: editUnit.trim() || "PCS",
          unit_price: editPrice ? parseFloat(editPrice) : null,
          gross_weight_kg: editWeight ? parseFloat(editWeight) : null,
          match_status: "manual_override",
        }
      );

      setEditingItem(null);
      docRes.reload();
    } catch (err: unknown) {
      setItemError(errorMessage(err));
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {doc.document_number || `Document #${doc.id}`}
            </h1>
            <Badge variant="outline" className="text-xs uppercase font-semibold">
              {documentTypeLabel(doc.document_type)}
            </Badge>
            {doc.status === "verified" && (
              <Badge className="bg-purple-50 text-purple-800 border-purple-200">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {doc.status === "reconciled" && (
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Reconciled
              </Badge>
            )}
            {doc.status === "flagged" && (
              <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Discrepancy Flags
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            File: <span className="font-mono text-slate-700">{doc.file_name}</span> • Language: {doc.language}
          </p>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>AI Extraction Confidence:</span>
            <span className="font-bold text-slate-900 font-mono">
              {doc.confidence_score ? `${Number(doc.confidence_score).toFixed(0)}%` : "95%"}
            </span>
          </div>
          {doc.verified_at && (
            <span className="text-xs text-purple-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified by {doc.verified_by_user?.name || "Staff"} on {new Date(doc.verified_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/documents/reconciliation">
            <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1">
              <Scale className="h-3.5 w-3.5" />
              <span>Cross-Reconcile</span>
            </Button>
          </Link>

          {can("documents.verify") && doc.status !== "verified" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerify}
              className="border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Mark Verified</span>
            </Button>
          )}

          {can("documents.verify") && (
            <PushToCargoDialog
              document={doc}
              shipments={shipments}
              onSynced={() => docRes.reload()}
            />
          )}
        </div>
      </div>

      {/* Metadata Cards */}
      {doc.extracted_metadata && (
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Building className="h-4 w-4 text-slate-500" />
              <span>Extracted Trade Metadata & Header Attributes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Supplier / Shipper:</span>
              <span className="font-semibold text-slate-800">{doc.extracted_metadata.supplier || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Consignee:</span>
              <span className="font-semibold text-slate-800">{doc.extracted_metadata.consignee || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Invoice / Contract #:</span>
              <span className="font-semibold text-slate-800">{doc.extracted_metadata.invoice_no || doc.extracted_metadata.contract_no || doc.document_number || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Invoice Date:</span>
              <span className="font-semibold text-slate-800">{doc.extracted_metadata.invoice_date || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Origin:</span>
              <span className="font-semibold text-slate-800">{doc.extracted_metadata.origin || doc.extracted_metadata.port_of_loading || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Destination:</span>
              <span className="font-semibold text-slate-800">{doc.extracted_metadata.destination || doc.extracted_metadata.port_of_discharge || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Container / Seal:</span>
              <span className="font-semibold text-slate-800">
                {doc.extracted_metadata.container_number ? `${doc.extracted_metadata.container_number} (${doc.extracted_metadata.seal_number || "No seal"})` : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Printed Totals (PL):</span>
              <span className="font-semibold text-slate-800">
                {doc.extracted_metadata.printed_totals?.packages ? `${doc.extracted_metadata.printed_totals.packages} pkgs • ${doc.extracted_metadata.printed_totals.gross_weight} kg` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Line Items Data Table */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <span>Extracted Line Items ({items.length} lines)</span>
          </CardTitle>
          <span className="text-xs text-slate-500">Auto-translated Chinese terms normalized to English</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">HS Code</th>
                  <th className="py-2.5 px-3">Original (Chinese)</th>
                  <th className="py-2.5 px-3">English Normalized Description</th>
                  <th className="py-2.5 px-3">Qty & Unit</th>
                  <th className="py-2.5 px-3">Unit Price</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Pkgs & Weights</th>
                  <th className="py-2.5 px-3">Match Status</th>
                  <th className="py-2.5 px-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-500">{item.line_number}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{item.hs_code || "—"}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{item.description_original || "—"}</td>
                    <td className="py-2.5 px-3 font-medium text-indigo-900 bg-indigo-50/30">
                      {item.description_english}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {Number(item.quantity).toLocaleString()} {item.unit_of_measure}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                      {item.total_amount ? `$${Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.package_count ? `${item.package_count} pkgs` : ""}
                      {item.gross_weight_kg ? ` • ${Number(item.gross_weight_kg)} kg` : ""}
                      {item.volume_cbm ? ` • ${Number(item.volume_cbm)} m³` : ""}
                      {!item.package_count && !item.gross_weight_kg && "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.match_status === "matched" && (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                          Matched
                        </span>
                      )}
                      {item.match_status === "discrepancy" && (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                          Variance
                        </span>
                      )}
                      {item.match_status === "confirmed" && (
                        <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-purple-200">
                          Confirmed
                        </span>
                      )}
                      {item.match_status === "manual_override" && (
                        <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-blue-200">
                          Edited
                        </span>
                      )}
                      {item.match_status === "unmatched" && (
                        <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {can("documents.upload") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Line Item Sheet */}
      {editingItem && (
        <Sheet open={true} onOpenChange={(open) => !open && setEditingItem(null)}>
          <SheetContent side="right" size="default" className="p-0">
            <form onSubmit={handleSaveItem} className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle className="text-base font-bold text-slate-900">
                  Edit Extracted Item #{editingItem.line_number}
                </SheetTitle>
              </SheetHeader>

              <SheetBody className="space-y-4">
                {itemError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {itemError}
                  </div>
                )}

                {editingItem.description_original && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-1">
                    <span className="text-slate-500 text-xs block font-semibold uppercase tracking-wider">
                      Original Source (Chinese / Khmer):
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {editingItem.description_original}
                    </span>
                  </div>
                )}

                <div>
                  <Label htmlFor="descEng" className="text-xs font-semibold text-slate-700">
                    English Normalized Description *
                  </Label>
                  <Input
                    id="descEng"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    required
                    className="mt-1 bg-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="hsCode" className="text-xs font-semibold text-slate-700">
                      HS Code
                    </Label>
                    <Input
                      id="hsCode"
                      value={editHs}
                      onChange={(e) => setEditHs(e.target.value)}
                      placeholder="e.g. 8452.29.00"
                      className="mt-1 font-mono text-sm bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit" className="text-xs font-semibold text-slate-700">
                      Unit of Measure *
                    </Label>
                    <Input
                      id="unit"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="PCS, SET, ROLL"
                      required
                      className="mt-1 text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="qty" className="text-xs font-semibold text-slate-700">
                      Quantity *
                    </Label>
                    <Input
                      id="qty"
                      type="number"
                      step="any"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      required
                      className="mt-1 text-sm font-mono bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-xs font-semibold text-slate-700">
                      Unit Price ($)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="any"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="mt-1 text-sm font-mono bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight" className="text-xs font-semibold text-slate-700">
                      Gross Wt (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="any"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="mt-1 text-sm font-mono bg-white"
                    />
                  </div>
                </div>
              </SheetBody>

              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={savingItem}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingItem}
                  className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
                >
                  {savingItem ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Line Item"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
