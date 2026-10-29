"use client";

import { useState } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Check,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { PageHeading, NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  documentsRoot,
  type DocumentReconciliation,
  type TradeDocument,
  type DocumentCatalog,
  type ReconciliationPair,
} from "@/lib/documents";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewReconciliationDialog } from "./new-reconciliation-dialog";
import { PushToCargoDialog } from "./push-to-cargo-dialog";

export function ReconciliationStudio({ initialReconciliationId }: { initialReconciliationId?: string }) {
  const { organization, can } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(initialReconciliationId || null);
  const [resolving, setResolving] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);

  const reconciliationsRes = useResource<Paginated<DocumentReconciliation>>(
    organization ? `${documentsRoot(organization.id)}/reconciliations` : null
  );

  const activeReconciliationRes = useResource<DocumentReconciliation>(
    organization && selectedId ? `${documentsRoot(organization.id)}/reconciliations/${selectedId}` : null
  );

  const documentsRes = useResource<Paginated<TradeDocument>>(
    organization ? `${documentsRoot(organization.id)}?per_page=100` : null
  );

  const catalogRes = useResource<{ data: DocumentCatalog }>(
    organization ? `${documentsRoot(organization.id)}/catalog` : null
  );

  if (!organization) return <NoOrganization />;
  if (reconciliationsRes.error) return <ErrorBox message={reconciliationsRes.error} />;
  if (activeReconciliationRes.error) return <ErrorBox message={activeReconciliationRes.error} />;
  if (!reconciliationsRes.data) return <Loading />;

  const reconciliations = reconciliationsRes.data?.data || [];
  const allDocs = documentsRes.data?.data || [];
  const invoices = allDocs.filter((d) => d.document_type === "commercial_invoice");
  const packingLists = allDocs.filter((d) => d.document_type === "packing_list");
  const rawCatalog = catalogRes.data as { data?: DocumentCatalog } | DocumentCatalog | undefined;
  const catalog = (rawCatalog && "data" in rawCatalog && rawCatalog.data ? rawCatalog.data : rawCatalog) as DocumentCatalog | undefined;
  const shipments = catalog?.shipments || [];

  const rawActive = activeReconciliationRes.data as { data?: DocumentReconciliation } | DocumentReconciliation | undefined;
  const activeRecordFromRes = (rawActive && "data" in rawActive && rawActive.data ? rawActive.data : rawActive) as DocumentReconciliation | null;
  const activeRecord = activeRecordFromRes || (reconciliations.length > 0 && !selectedId ? reconciliations[0] : null);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord || !organization) return;
    setResolving(true);

    try {
      await api.post(`${documentsRoot(organization.id)}/reconciliations/${activeRecord.id}/resolve`, {
        notes: resolveNotes.trim(),
      });

      setShowResolveModal(false);
      setResolveNotes("");
      reconciliationsRes.reload();
      if (selectedId) activeReconciliationRes.reload();
    } catch (err: unknown) {
      alert(errorMessage(err));
    } finally {
      setResolving(false);
    }
  };

  const pairs: ReconciliationPair[] = (activeRecord?.pairs as ReconciliationPair[]) || [];
  const issues: string[] = (activeRecord?.discrepancies as string[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          title="Cross-Document Reconciliation Studio"
          description="Automated cross-check comparing Commercial Invoice items against Packing List records."
        />
        <div className="flex items-center gap-2">
          {can("documents.verify") && (
            <NewReconciliationDialog
              invoices={invoices}
              packingLists={packingLists}
              onCreated={(id) => {
                setSelectedId(id.toString());
                reconciliationsRes.reload();
              }}
            />
          )}
        </div>
      </div>

      {/* History Selector Bar */}
      {reconciliations.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Recent Runs:
          </span>
          {reconciliations.map((rec) => {
            const isSelected = activeRecord?.id === rec.id;
            return (
              <button
                key={rec.id}
                onClick={() => setSelectedId(rec.id.toString())}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Reconciliation #{rec.id}</span>
                {rec.status === "balanced" && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`} />
                )}
                {rec.status === "has_discrepancies" && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} />
                )}
                {rec.status === "resolved" && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-purple-300" : "bg-purple-500"}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!activeRecord ? (
        <Empty
          title="No Reconciliation Active"
          description="Pair a Commercial Invoice with a Packing List using 'New Cross-Reconciliation' to analyze variances."
        />
      ) : (
        <div className="space-y-6">
          {/* Status & Header Metrics Card */}
          <Card className="shadow-xs border-slate-200">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Reconciliation #{activeRecord.id}
                    </h2>
                    {activeRecord.status === "balanced" && (
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        100% Balanced Match
                      </Badge>
                    )}
                    {activeRecord.status === "has_discrepancies" && (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {activeRecord.discrepancy_count} Discrepancies Found
                      </Badge>
                    )}
                    {activeRecord.status === "resolved" && (
                      <Badge className="bg-purple-50 text-purple-800 border-purple-200">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Resolved & Accepted
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                    <span>
                      Invoice: <strong className="text-slate-800">{activeRecord.invoice_document?.document_number || `Doc #${activeRecord.invoice_document_id}`}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Packing List: <strong className="text-slate-800">{activeRecord.packing_list_document?.document_number || `Doc #${activeRecord.packing_list_document_id}`}</strong>
                    </span>
                    {activeRecord.shipment && (
                      <>
                        <span>•</span>
                        <span>
                          Shipment: <strong className="text-indigo-600">{activeRecord.shipment.shipment_number}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {can("documents.verify") && activeRecord.status === "has_discrepancies" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResolveModal(true)}
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Resolve Discrepancies</span>
                    </Button>
                  )}

                  {activeRecord.invoice_document && can("documents.verify") && (
                    <PushToCargoDialog
                      document={activeRecord.invoice_document}
                      shipments={shipments}
                      onSynced={() => {
                        reconciliationsRes.reload();
                        if (selectedId) activeReconciliationRes.reload();
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Numerical Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Line Items Count</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {activeRecord.matched_items_count} matched / {activeRecord.total_invoice_items} inv / {activeRecord.total_packing_items} pkg
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Item Quantity</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>{Number(activeRecord.invoice_total_quantity).toLocaleString()} inv</span>
                    <span className="text-slate-400">vs</span>
                    <span>{Number(activeRecord.packing_total_quantity).toLocaleString()} pkg</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Gross Weight</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {activeRecord.packing_total_gross_weight ? `${Number(activeRecord.packing_total_gross_weight).toLocaleString()} kg` : "—"}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Reviewer / Audit</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {activeRecord.reviewed_by_user?.name || "Automated AI Review"}
                  </div>
                </div>
              </div>

              {activeRecord.notes && (
                <div className="mt-4 p-3 bg-purple-50/50 border border-purple-200 text-purple-900 text-xs rounded-lg flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Resolution Note:</span> {activeRecord.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discrepancies Alert Box */}
          {issues.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Detected Variances & Discrepancies ({issues.length})</span>
              </div>
              <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Side-by-Side Comparison Data Grid */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-600" />
                <span>Side-by-Side Line Items Comparison</span>
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Matched
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Variance
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-1/2 border-r border-slate-200 bg-blue-50/40 text-blue-900">
                        Commercial Invoice Line
                      </th>
                      <th className="py-2.5 px-3 w-1/2 bg-emerald-50/40 text-emerald-900">
                        Packing List Corresponding Line
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pairs.map((pair, index) => {
                      const isMatched = pair.status === "matched";
                      return (
                        <tr
                          key={index}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !isMatched ? "bg-amber-50/20" : ""
                          }`}
                        >
                          {/* Left: Invoice Side */}
                          <td className="py-3 px-4 border-r border-slate-200 align-top">
                            {pair.invoice_item ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 text-xs">
                                    Line #{pair.invoice_item.line_number} • {pair.invoice_item.description_english}
                                  </span>
                                  <span className="font-mono text-slate-500 text-[11px]">
                                    {pair.invoice_item.hs_code || "No HS"}
                                  </span>
                                </div>
                                {pair.invoice_item.description_original && (
                                  <div className="text-[11px] text-slate-500">
                                    Original Chinese: {pair.invoice_item.description_original}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-800">
                                  <span>
                                    Qty: {Number(pair.invoice_item.quantity).toLocaleString()} {pair.invoice_item.unit_of_measure}
                                  </span>
                                  {pair.invoice_item.unit_price && (
                                    <span>• Price: ${Number(pair.invoice_item.unit_price).toFixed(2)}</span>
                                  )}
                                  {pair.invoice_item.total_amount && (
                                    <span>• Total: ${Number(pair.invoice_item.total_amount).toFixed(2)}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic text-xs py-2">
                                (No corresponding line on invoice)
                              </div>
                            )}
                          </td>

                          {/* Right: Packing List Side */}
                          <td className="py-3 px-4 align-top">
                            {pair.packing_item ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 text-xs">
                                    Line #{pair.packing_item.line_number} • {pair.packing_item.description_english}
                                  </span>
                                  {isMatched ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-emerald-200 flex items-center gap-0.5">
                                      <Check className="h-3 w-3" />
                                      Matched
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-amber-200 flex items-center gap-0.5">
                                      <AlertTriangle className="h-3 w-3" />
                                      Variance
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-800">
                                  <span>
                                    Qty: {Number(pair.packing_item.quantity).toLocaleString()} {pair.packing_item.unit_of_measure}
                                  </span>
                                  {pair.packing_item.package_count && (
                                    <span>• Pkgs: {pair.packing_item.package_count} {pair.packing_item.package_type || "pkgs"}</span>
                                  )}
                                  {pair.packing_item.gross_weight_kg && (
                                    <span>• G.W: {Number(pair.packing_item.gross_weight_kg)} kg</span>
                                  )}
                                  {pair.packing_item.volume_cbm && (
                                    <span>• Vol: {Number(pair.packing_item.volume_cbm)} m³</span>
                                  )}
                                </div>
                                {pair.issues && pair.issues.length > 0 && (
                                  <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1">
                                    {pair.issues.join(" • ")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-red-500 italic text-xs py-2 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>Missing on packing list!</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Resolve Modal */}
          {showResolveModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl">
                <form onSubmit={handleResolve}>
                  <h3 className="text-base font-bold text-slate-900">
                    Resolve Discrepancies
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Accept noted variances (e.g. buyer approved short-shipment or tolerance variances) to mark this reconciliation resolved.
                  </p>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-slate-700 block">
                      Resolution Notes / Justification
                    </label>
                    <textarea
                      rows={3}
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      placeholder="e.g. Consignee approved 2 units short shipment via email..."
                      className="w-full text-xs mt-1 border border-slate-200 rounded-md p-2 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResolveModal(false)}
                      disabled={resolving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={resolving}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {resolving ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        "Mark Resolved"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
