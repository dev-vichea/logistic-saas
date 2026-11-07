"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Layers,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WorkspaceCard } from "@/components/workspace-drawer";
import { api, errorMessage } from "@/lib/api";
import { materialRequestsRoot, type MaterialRequest } from "@/lib/material-requests";
import { partnerRoot, type PartnerPage } from "@/lib/partners";
import { purchaseOrdersRoot, type PurchaseOrder } from "@/lib/purchase-orders";
import type { Paginated } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

type OrderRow = {
  sourceId: number;
  description: string;
  specification: string | null;
  requestedQuantity: number;
  unit: string;
  quantity: string;
  unitPrice: string;
};

function rowsFromRequest(request: MaterialRequest): OrderRow[] {
  return (request.items ?? []).map((item) => ({
    sourceId: item.id,
    description: item.description,
    specification: item.specification,
    requestedQuantity: Number(item.quantity),
    unit: item.unit,
    quantity: String(item.quantity),
    unitPrice: "",
  }));
}

export function PurchaseOrderFormDrawer({
  materialRequest,
  purchaseOrder,
  onSaved,
}: {
  materialRequest?: MaterialRequest;
  purchaseOrder?: PurchaseOrder;
  onSaved: (order: PurchaseOrder) => void;
}) {
  const { organization, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [requestId, setRequestId] = useState<number | null>(materialRequest?.id ?? purchaseOrder?.material_request_id ?? null);
  const [supplierId, setSupplierId] = useState<number | null>(purchaseOrder?.supplier_partner_id ?? null);
  const [expectedDate, setExpectedDate] = useState(purchaseOrder?.expected_delivery_date?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(purchaseOrder?.notes ?? "");
  const [rows, setRows] = useState<OrderRow[]>(() => materialRequest ? rowsFromRequest(materialRequest) : []);

  const root = organization ? materialRequestsRoot(organization.id) : null;
  const candidates = useResource<Paginated<MaterialRequest>>(
    open && root && !materialRequest && !purchaseOrder
      ? `${root}?status=submitted&per_page=100&q=${encodeURIComponent(requestSearch.trim())}`
      : null,
  );
  const sourceResource = useResource<{ data: MaterialRequest }>(
    open && root && requestId && !materialRequest
      ? `${root}/${requestId}`
      : null,
  );
  const suppliers = useResource<PartnerPage>(
    open && organization
      ? `${partnerRoot(organization.id)}?role=supplier&per_page=100&q=${encodeURIComponent(supplierSearch.trim())}`
      : null,
  );

  const source = materialRequest ?? (sourceResource.data?.data.id === requestId ? sourceResource.data.data : null);
  const activeRows = rows.length > 0 ? rows : source ? rowsFromRequest(source) : [];

  function changeOpen(next: boolean) {
    if (next) {
      setError("");
      setRequestSearch("");
      setSupplierSearch("");
      setRequestId(materialRequest?.id ?? purchaseOrder?.material_request_id ?? null);
      setSupplierId(purchaseOrder?.supplier_partner_id ?? null);
      setExpectedDate(purchaseOrder?.expected_delivery_date?.slice(0, 10) ?? "");
      setNotes(purchaseOrder?.notes ?? "");
      setRows(purchaseOrder?.items?.map((item) => ({
        sourceId: item.material_request_item_id,
        description: item.description,
        specification: item.specification,
        requestedQuantity: Number(item.quantity),
        unit: item.unit,
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? (materialRequest ? rowsFromRequest(materialRequest) : []));
    }
    setOpen(next);
  }

  function changeRow(sourceId: number, field: "quantity" | "unitPrice", value: string) {
    setRows(activeRows.map((row) => row.sourceId === sourceId ? { ...row, [field]: value } : row));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !requestId || !supplierId || activeRows.length === 0) {
      setError("Choose a material request and supplier.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      material_request_id: requestId,
      supplier_partner_id: supplierId,
      expected_delivery_date: expectedDate || null,
      notes: notes.trim() || null,
      items: activeRows.map((row) => ({
        material_request_item_id: row.sourceId,
        quantity: Number(row.quantity),
        unit_price: Number(row.unitPrice),
      })),
    };
    try {
      const url = purchaseOrdersRoot(organization.id);
      const result = purchaseOrder
        ? await api.patch<{ data: PurchaseOrder }>(`${url}/${purchaseOrder.id}`, payload)
        : await api.post<{ data: PurchaseOrder }>(url, payload);
      setOpen(false);
      notify(purchaseOrder ? "Purchase order updated." : "Purchase order saved as draft.");
      onSaved(result.data.data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const label = purchaseOrder ? "Edit purchase order" : "New purchase order";
  const total = activeRows.reduce((sum, row) => sum + Number(row.quantity) * Number(row.unitPrice), 0);

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button variant={purchaseOrder ? "outline" : "default"}>
          {purchaseOrder ? <Pencil size={15} /> : <Plus size={15} />}
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        size={isFullscreen ? "full" : "4/5"}
        className="flex flex-col gap-0 border-l border-slate-200 p-0 overflow-hidden shadow-2xl transition-all duration-300 bg-[#F5F6F8]"
        showCloseButton={false}
        aria-label={label}
      >
        <form onSubmit={save} className="flex h-full flex-col">
          {/* Top Header Drafts & Action Bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 select-none">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-3">
              <div className="flex h-10 min-w-44 items-center rounded-t-lg border border-b-0 border-slate-200 border-t-2 border-t-blue-600 bg-white px-3 font-semibold text-blue-950 shadow-2xs">
                <span className="size-2 shrink-0 rounded-xs bg-blue-600 mr-2" />
                <span className="truncate text-xs font-semibold">{label}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pl-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 gap-1.5 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                title={isFullscreen ? "Switch to 4/5 drawer" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">
                  {isFullscreen ? "Standard 4/5" : "Fullscreen"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="h-8 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={saving || activeRows.length === 0}
                className="h-8 gap-1 px-3.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
              >
                {saving ? "Saving…" : purchaseOrder ? "Save changes" : "Save draft PO"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
                className="size-8 p-0 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={15} />
              </Button>
            </div>
          </div>

          <SheetTitle className="sr-only">{label}</SheetTitle>
          <SheetDescription className="sr-only">Choose a supplier and price the materials from a submitted request.</SheetDescription>

          {/* Form Body with Cards */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-3.5">
            <ErrorBox message={error || candidates.error || sourceResource.error || suppliers.error} />

            {/* Card 1: Material Request & Supplier */}
            <WorkspaceCard
              icon={Building2}
              iconBg="bg-blue-50 text-blue-600"
              title="Stakeholders & Source Request"
              subtitle="Link the material demand and assign the approved supplier partner"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {materialRequest || purchaseOrder ? (
                  <div>
                    <Label className="text-[11px] font-medium text-slate-600">Material request</Label>
                    <div className="mt-1 flex h-[38px] items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs">
                      <Link
                        href={`/material-requests/${requestId}`}
                        className="font-semibold text-blue-900 hover:underline truncate"
                      >
                        {materialRequest?.request_number ?? purchaseOrder?.material_request?.request_number}
                      </Link>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span className="truncate text-slate-600">
                        {materialRequest?.title ?? purchaseOrder?.material_request?.title}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="po-request-search" className="text-[11px] font-medium text-slate-600">
                      Material request
                    </Label>
                    <div className="space-y-1.5 mt-1">
                      <Input
                        id="po-request-search"
                        placeholder="Search submitted requests..."
                        value={requestSearch}
                        onChange={(event) => setRequestSearch(event.target.value)}
                        className="h-[38px] bg-white text-xs font-normal"
                      />
                      <Select
                        value={requestId ? String(requestId) : undefined}
                        onValueChange={(value) => {
                          setRequestId(Number(value));
                          setRows([]);
                        }}
                      >
                        <SelectTrigger aria-label="Material request" className="h-[38px] bg-white text-xs">
                          <SelectValue placeholder="Select a submitted request" />
                        </SelectTrigger>
                        <SelectContent>
                          {(candidates.data?.data ?? [])
                            .filter((req) => !req.purchase_order)
                            .map((req) => (
                              <SelectItem key={req.id} value={String(req.id)} className="text-xs">
                                {req.request_number} · {req.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="po-supplier-search" className="text-[11px] font-medium text-slate-600">
                    Supplier
                  </Label>
                  <div className="space-y-1.5 mt-1">
                    <Input
                      id="po-supplier-search"
                      placeholder="Search suppliers..."
                      value={supplierSearch}
                      onChange={(event) => setSupplierSearch(event.target.value)}
                      className="h-[38px] bg-white text-xs font-normal"
                    />
                    <Select
                      value={supplierId ? String(supplierId) : undefined}
                      onValueChange={(value) => setSupplierId(Number(value))}
                    >
                      <SelectTrigger aria-label="Supplier" className="h-[38px] bg-white text-xs">
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {(suppliers.data?.data ?? []).map((partner) => (
                          <SelectItem key={partner.id} value={String(partner.id)} className="text-xs">
                            {partner.name} {partner.code ? `· ${partner.code}` : ""}
                          </SelectItem>
                        ))}
                        {purchaseOrder?.supplier &&
                          !suppliers.data?.data.some((partner) => partner.id === purchaseOrder.supplier_partner_id) && (
                            <SelectItem value={String(purchaseOrder.supplier_partner_id)} className="text-xs">
                              {purchaseOrder.supplier_name}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </WorkspaceCard>

            {/* Card 2: Delivery & Total */}
            <WorkspaceCard
              icon={Calendar}
              iconBg="bg-amber-50 text-amber-600"
              title="Delivery Schedule & Pricing Summary"
              badge={
                activeRows.length > 0 ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono font-semibold">
                    Est. Total: {organization?.currency}{" "}
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Badge>
                ) : undefined
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="po-expected-date" className="text-[11px] font-medium text-slate-600">
                    Expected delivery date
                  </Label>
                  <Input
                    id="po-expected-date"
                    type="date"
                    value={expectedDate}
                    onChange={(event) => setExpectedDate(event.target.value)}
                    className="mt-1 h-[38px] bg-white text-xs font-normal"
                  />
                </div>
              </div>
            </WorkspaceCard>

            {/* Card 3: Order Items */}
            <WorkspaceCard
              icon={ShoppingBag}
              iconBg="bg-purple-50 text-purple-600"
              title="Order Line Items"
              subtitle="Set purchase quantities and unit prices for each requested material"
            >
              <div className="space-y-3">
                {activeRows.map((row, index) => {
                  const requested = source?.items?.find((item) => item.id === row.sourceId);
                  const maxQuantity = requested ? Number(requested.quantity) : row.requestedQuantity;
                  return (
                    <div
                      key={row.sourceId}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {index + 1}. {row.description}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Req: {maxQuantity.toLocaleString()} {row.unit}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`po-quantity-${row.sourceId}`} className="text-[11px] font-medium text-slate-600">
                            Quantity
                          </Label>
                          <Input
                            id={`po-quantity-${row.sourceId}`}
                            type="number"
                            required
                            min="0.001"
                            max={maxQuantity}
                            step="0.001"
                            value={row.quantity}
                            onChange={(event) => changeRow(row.sourceId, "quantity", event.target.value)}
                            className="mt-1 h-[38px] bg-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`po-price-${row.sourceId}`} className="text-[11px] font-medium text-slate-600">
                            Unit price ({organization?.currency})
                          </Label>
                          <Input
                            id={`po-price-${row.sourceId}`}
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={row.unitPrice}
                            onChange={(event) => changeRow(row.sourceId, "unitPrice", event.target.value)}
                            className="mt-1 h-[38px] bg-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {requestId && activeRows.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Loading request materials...</p>
                )}
              </div>
            </WorkspaceCard>

            {/* Card 4: Notes */}
            <WorkspaceCard
              icon={Layers}
              iconBg="bg-slate-100 text-slate-600"
              title="Notes to Supplier"
            >
              <div>
                <Label htmlFor="po-notes" className="text-[11px] font-medium text-slate-600">
                  Notes to supplier
                </Label>
                <Textarea
                  id="po-notes"
                  maxLength={5000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Payment terms, packing specifications, or delivery instructions..."
                  className="mt-1 bg-white text-xs"
                />
              </div>
            </WorkspaceCard>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
