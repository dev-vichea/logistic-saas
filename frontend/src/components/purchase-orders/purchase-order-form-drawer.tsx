"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
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
  const activeRows = rows.length > 0 ? rows : !purchaseOrder && !materialRequest && source ? rowsFromRequest(source) : rows;

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
      <SheetContent side="right" size="xl" className="p-0">
        <form onSubmit={save} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>Choose a supplier and price the materials from a submitted request.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-6">
            <ErrorBox message={error || candidates.error || sourceResource.error || suppliers.error} />
            {materialRequest || purchaseOrder ? (
              <div className="space-y-2">
                <Label>Material request</Label>
                <p className="text-sm">
                  <Link href={`/material-requests/${requestId}`} className="text-blue-900 hover:underline">
                    {materialRequest?.request_number ?? purchaseOrder?.material_request?.request_number}
                  </Link>
                  {" · "}{materialRequest?.title ?? purchaseOrder?.material_request?.title}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="po-request-search">Material request</Label>
                <Input id="po-request-search" placeholder="Search submitted requests..." value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} />
                <Select value={requestId ? String(requestId) : undefined} onValueChange={(value) => { setRequestId(Number(value)); setRows([]); }}>
                  <SelectTrigger aria-label="Material request"><SelectValue placeholder="Select a submitted request" /></SelectTrigger>
                  <SelectContent>
                    {(candidates.data?.data ?? []).filter((request) => !request.purchase_order).map((request) => (
                      <SelectItem key={request.id} value={String(request.id)}>{request.request_number} · {request.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only submitted requests without a PO are available.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="po-supplier-search">Supplier</Label>
              <Input id="po-supplier-search" placeholder="Search suppliers..." value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} />
              <Select value={supplierId ? String(supplierId) : undefined} onValueChange={(value) => setSupplierId(Number(value))}>
                <SelectTrigger aria-label="Supplier"><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                <SelectContent>
                  {(suppliers.data?.data ?? []).map((partner) => (
                    <SelectItem key={partner.id} value={String(partner.id)}>{partner.name}{partner.code ? ` · ${partner.code}` : ""}</SelectItem>
                  ))}
                  {purchaseOrder?.supplier && !suppliers.data?.data.some((partner) => partner.id === purchaseOrder.supplier_partner_id) && (
                    <SelectItem value={String(purchaseOrder.supplier_partner_id)}>{purchaseOrder.supplier_name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Suppliers come from Business partners.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-expected-date">Expected delivery date</Label>
              <Input id="po-expected-date" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
            </div>
            <div className="space-y-3">
              <div><h3 className="text-sm font-semibold">Order items</h3><p className="text-xs text-muted-foreground">Set a quantity and unit price for each requested material.</p></div>
              {activeRows.map((row, index) => {
                const requested = source?.items?.find((item) => item.id === row.sourceId);
                const maxQuantity = requested ? Number(requested.quantity) : row.requestedQuantity;
                return (
                  <div key={row.sourceId} className="panel space-y-3 p-4">
                    <div><p className="text-sm font-semibold">{index + 1}. {row.description}</p><p className="text-xs text-muted-foreground">{row.specification ?? "No specification"} · Requested {maxQuantity.toLocaleString()} {row.unit}</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label htmlFor={`po-quantity-${row.sourceId}`}>Quantity</Label><Input id={`po-quantity-${row.sourceId}`} type="number" required min="0.001" max={maxQuantity} step="0.001" value={row.quantity} onChange={(event) => changeRow(row.sourceId, "quantity", event.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor={`po-price-${row.sourceId}`}>Unit price ({organization?.currency})</Label><Input id={`po-price-${row.sourceId}`} type="number" required min="0" step="0.01" value={row.unitPrice} onChange={(event) => changeRow(row.sourceId, "unitPrice", event.target.value)} /></div>
                    </div>
                  </div>
                );
              })}
              {requestId && activeRows.length === 0 && <p className="text-sm text-muted-foreground">Loading request materials...</p>}
              {activeRows.length > 0 && <p className="text-right text-sm font-semibold">Estimated total: {organization?.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
            </div>
            <div className="space-y-2"><Label htmlFor="po-notes">Notes to supplier</Label><Textarea id="po-notes" maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || activeRows.length === 0}>{saving ? "Saving…" : purchaseOrder ? "Save changes" : "Save draft PO"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
