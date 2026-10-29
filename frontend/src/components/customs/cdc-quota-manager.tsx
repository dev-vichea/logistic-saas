"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { PageHeading, NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  customsRoot,
  type CdcMasterList,
} from "@/lib/customs";
import { type Paginated } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function CdcQuotaManager() {
  const { organization, can, notify } = useWorkspace();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [newListOpen, setNewListOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  // New Master List form state
  const [qipNumber, setQipNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  const [effectiveYear, setEffectiveYear] = useState(new Date().getFullYear().toString());
  const [validFrom, setValidFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [validUntil, setValidUntil] = useState(`${new Date().getFullYear()}-12-31`);
  const [listNotes, setListNotes] = useState("");
  const [submittingList, setSubmittingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // New Item form state
  const [itemCategory, setItemCategory] = useState("raw_materials");
  const [itemNumber, setItemNumber] = useState("1");
  const [descriptionOriginal, setDescriptionOriginal] = useState("");
  const [descriptionEnglish, setDescriptionEnglish] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [modelSpec, setModelSpec] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("PCS");
  const [approvedQuantity, setApprovedQuantity] = useState("1000");
  const [unitPriceUsd, setUnitPriceUsd] = useState("0");
  const [itemRemarks, setItemRemarks] = useState("");
  const [submittingItem, setSubmittingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const listsRes = useResource<Paginated<CdcMasterList>>(
    organization ? `${customsRoot(organization.id)}/cdc-lists` : null
  );

  if (!organization) return <NoOrganization />;
  if (listsRes.error) return <ErrorBox message={listsRes.error} />;
  if (!listsRes.data) return <Loading />;

  const lists = listsRes.data.data || [];

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setSubmittingList(true);
    setListError(null);

    try {
      await api.post(`${customsRoot(organization.id)}/cdc-lists`, {
        qip_number: qipNumber.trim(),
        company_name: companyName.trim(),
        tin_number: tinNumber.trim() || null,
        approval_reference: approvalReference.trim(),
        effective_year: parseInt(effectiveYear) || new Date().getFullYear(),
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        notes: listNotes.trim() || null,
      });

      notify("CDC Master List registered successfully");
      listsRes.reload();
      setNewListOpen(false);
      // Reset form
      setQipNumber("");
      setCompanyName("");
      setApprovalReference("");
    } catch (err) {
      setListError(errorMessage(err));
    } finally {
      setSubmittingList(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !selectedListId) return;
    setSubmittingItem(true);
    setItemError(null);

    try {
      await api.post(`${customsRoot(organization.id)}/cdc-lists/${selectedListId}/items`, {
        category: itemCategory,
        item_number: parseInt(itemNumber) || 1,
        description_original: descriptionOriginal.trim() || null,
        description_english: descriptionEnglish.trim(),
        hs_code: hsCode.trim() || null,
        model_specification: modelSpec.trim() || null,
        unit_of_measure: unitOfMeasure.trim() || "PCS",
        approved_quantity: parseFloat(approvedQuantity) || 0,
        unit_price_usd: parseFloat(unitPriceUsd) || 0,
        remarks: itemRemarks.trim() || null,
      });

      notify("Approved QIP item added to Master List");
      listsRes.reload();
      setNewItemOpen(false);
      // Reset form
      setDescriptionEnglish("");
      setDescriptionOriginal("");
      setHsCode("");
    } catch (err) {
      setItemError(errorMessage(err));
    } finally {
      setSubmittingItem(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="CDC Duty-Free Master Lists (QIP Quotas)"
        description="Council for the Development of Cambodia (CDC) duty-free import approvals for Qualified Investment Projects (QIP), quota monitoring and remaining stock balances."
        action={
          can("customs.manage") ? (
            <Button
              onClick={() => setNewListOpen(true)}
              className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Register CDC Master List
            </Button>
          ) : undefined
        }
      />

      {lists.length === 0 ? (
        <Empty
          title="No CDC Master Lists registered"
          description="Register a Qualified Investment Project (QIP) master list approval issued by CDC to enable duty-free import declarations and automatic quota cut-stock tracking."
          action={
            can("customs.manage") ? (
              <Button onClick={() => setNewListOpen(true)} className="gap-2 bg-primary text-white">
                <Plus className="w-4 h-4" />
                Register CDC Master List
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {lists.map((list) => {
            const items = list.items || [];
            const filteredItems = items.filter((it) => {
              if (categoryFilter && it.category !== categoryFilter) return false;
              if (search.trim()) {
                const s = search.toLowerCase();
                return (
                  it.description_english.toLowerCase().includes(s) ||
                  (it.description_original && it.description_original.toLowerCase().includes(s)) ||
                  (it.hs_code && it.hs_code.toLowerCase().includes(s)) ||
                  it.item_number.toString() === s
                );
              }
              return true;
            });

            return (
              <Card key={list.id} className="border-slate-200 shadow-xs overflow-hidden">
                {/* List Header */}
                <div className="bg-slate-900 text-white p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          QIP #{list.qip_number}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-slate-400">
                          Year {list.effective_year}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                          {list.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mt-1.5 text-white">{list.company_name}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1">
                        <span>Approval Ref: <strong className="font-mono text-white">{list.approval_reference}</strong></span>
                        {list.tin_number && <span>TIN: <strong className="font-mono text-white">{list.tin_number}</strong></span>}
                        {list.valid_from && (
                          <span>Validity: <strong className="text-white">{list.valid_from} to {list.valid_until || "Ongoing"}</strong></span>
                        )}
                      </div>
                    </div>

                    {can("customs.manage") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedListId(list.id);
                          setItemNumber(((items.length || 0) + 1).toString());
                          setNewItemOpen(true);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 self-start md:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Approved Item
                      </Button>
                    )}
                  </div>
                </div>

                {/* Master Items Table with Quota Progress Meters */}
                <CardContent className="p-0">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Search items, HS code..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white"
                        />
                      </div>
                      <Select
                        value={categoryFilter || "all"}
                        onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="h-8 w-44 text-xs bg-white">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="machinery_equipment">Machinery & Equipment</SelectItem>
                          <SelectItem value="raw_materials">Raw Materials</SelectItem>
                          <SelectItem value="accessories">Accessories / Trims</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Showing {filteredItems.length} of {items.length} approved quota items
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="py-2.5 px-3 w-12">#</th>
                          <th className="py-2.5 px-3 w-28">HS Code</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Item Description & Spec</th>
                          <th className="py-2.5 px-3 w-32">Category</th>
                          <th className="py-2.5 px-3 text-right w-28">Approved Qty</th>
                          <th className="py-2.5 px-3 text-right w-28">Consumed</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Remaining Balance</th>
                          <th className="py-2.5 px-3 text-right w-28">Total Val ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredItems.length > 0 ? (
                          filteredItems.map((it) => {
                            const approved = parseFloat(String(it.approved_quantity)) || 0;
                            const consumed = parseFloat(String(it.consumed_quantity)) || 0;
                            const remaining = parseFloat(String(it.remaining_quantity)) || 0;
                            const pctConsumed = approved > 0 ? Math.min(100, (consumed / approved) * 100) : 0;
                            const pctRemaining = 100 - pctConsumed;

                            let progressColor = "bg-emerald-500";
                            if (pctRemaining <= 15) progressColor = "bg-rose-500";
                            else if (pctRemaining <= 35) progressColor = "bg-amber-500";

                            return (
                              <tr key={it.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-3 font-mono font-medium text-slate-400">
                                  {it.item_number}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                  {it.hs_code || "N/A"}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">
                                    {it.description_english}
                                  </div>
                                  {it.description_original && (
                                    <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                                      {it.description_original}
                                    </div>
                                  )}
                                  {it.model_specification && (
                                    <div className="text-[10px] text-primary font-mono mt-0.5">
                                      Spec: {it.model_specification}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="capitalize text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {it.category.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                                  {approved.toLocaleString()} <span className="text-[10px] text-slate-400">{it.unit_of_measure}</span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-500">
                                  {consumed.toLocaleString()}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="font-mono font-bold text-slate-900">
                                      {remaining.toLocaleString()} {it.unit_of_measure}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      {pctRemaining.toFixed(0)}% left
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${progressColor}`}
                                      style={{ width: `${pctConsumed}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                                  ${parseFloat(String(it.total_price_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No items match the active filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Register CDC Master List Sheet */}
      <Sheet open={newListOpen} onOpenChange={setNewListOpen}>
        <SheetContent side="right" size="lg" className="p-0">
          <form onSubmit={handleCreateList} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle className="text-base font-bold text-slate-900">
                Register CDC QIP Duty-Free Master List
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Add a CDC duty-free import approval letter for Qualified Investment Projects.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {listError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  {listError}
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-slate-700">QIP Approval Number</Label>
                <Input
                  value={qipNumber}
                  onChange={(e) => setQipNumber(e.target.value)}
                  placeholder="e.g. 211-26"
                  className="mt-1 text-sm font-mono bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Company Name (as registered with CDC)</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Xin Cai Fu Garments (Cambodia) Co., Ltd"
                  className="mt-1 text-sm bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Approval Reference</Label>
                  <Input
                    value={approvalReference}
                    onChange={(e) => setApprovalReference(e.target.value)}
                    placeholder="e.g. CDC/CRDB/2026/0488"
                    className="mt-1 text-sm font-mono bg-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tax TIN Number</Label>
                  <Input
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    placeholder="e.g. K008-902100412"
                    className="mt-1 text-sm font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Effective Year</Label>
                  <Input
                    type="number"
                    value={effectiveYear}
                    onChange={(e) => setEffectiveYear(e.target.value)}
                    className="mt-1 text-sm font-mono bg-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Valid From</Label>
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="mt-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Valid Until</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="mt-1 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Notes / Exemption Scope</Label>
                <Textarea
                  value={listNotes}
                  onChange={(e) => setListNotes(e.target.value)}
                  placeholder="Duty-free raw materials and machinery for QIP manufacturing line."
                  rows={3}
                  className="mt-1 text-xs bg-white"
                />
              </div>
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewListOpen(false)}
                disabled={submittingList}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingList} className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs">
                {submittingList ? "Registering..." : "Register Master List"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Approved Item Sheet */}
      <Sheet open={newItemOpen} onOpenChange={setNewItemOpen}>
        <SheetContent side="right" size="lg" className="p-0">
          <form onSubmit={handleAddItem} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle className="text-base font-bold text-slate-900">
                Add Approved Item to QIP Master List
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Enter the approved item specification, tariff code, and duty-free quantity quota.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {itemError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  {itemError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Item Category</Label>
                  <Select value={itemCategory} onValueChange={setItemCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_materials">Raw Materials</SelectItem>
                      <SelectItem value="machinery_equipment">Machinery & Equipment</SelectItem>
                      <SelectItem value="accessories">Accessories / Trims</SelectItem>
                      <SelectItem value="packaging">Packaging Materials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Item Sequence #</Label>
                  <Input
                    type="number"
                    value={itemNumber}
                    onChange={(e) => setItemNumber(e.target.value)}
                    className="mt-1 text-sm font-mono bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">English Description</Label>
                <Input
                  value={descriptionEnglish}
                  onChange={(e) => setDescriptionEnglish(e.target.value)}
                  placeholder="e.g. Single needle lockstitch industrial sewing machine"
                  className="mt-1 text-sm bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Original Description (Khmer / Chinese)</Label>
                <Input
                  value={descriptionOriginal}
                  onChange={(e) => setDescriptionOriginal(e.target.value)}
                  placeholder="e.g. 工业缝纫机 (Lockstitch Industrial Sewing Machine)"
                  className="mt-1 text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">HS Tariff Code</Label>
                  <Input
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    placeholder="e.g. 8452.29.00"
                    className="mt-1 text-sm font-mono bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Model / Specification</Label>
                  <Input
                    value={modelSpec}
                    onChange={(e) => setModelSpec(e.target.value)}
                    placeholder="e.g. DDK-8700D"
                    className="mt-1 text-sm font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Approved Quota</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={approvedQuantity}
                    onChange={(e) => setApprovedQuantity(e.target.value)}
                    className="mt-1 text-sm font-mono bg-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Unit of Measure</Label>
                  <Input
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                    placeholder="PCS"
                    className="mt-1 text-sm bg-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Unit Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPriceUsd}
                    onChange={(e) => setUnitPriceUsd(e.target.value)}
                    className="mt-1 text-sm font-mono bg-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Remarks / Order Reference</Label>
                <Input
                  value={itemRemarks}
                  onChange={(e) => setItemRemarks(e.target.value)}
                  placeholder="e.g. Approved under CDC Decision No. 0488/26"
                  className="mt-1 text-sm bg-white"
                />
              </div>
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewItemOpen(false)}
                disabled={submittingItem}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingItem} className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs">
                {submittingItem ? "Adding..." : "Add Approved Item"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
