"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { ErrorBox, Loading, NoOrganization, formatDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordField, RecordPanel, RecordProgress } from "@/components/record-workspace/record-sections";
import { RecordDrawerShell, RecordWorkspace, RelatedRecordButton } from "@/components/record-workspace/record-workspace";
import { api, errorMessage } from "@/lib/api";
import { purchaseOrdersRoot, type PurchaseOrder } from "@/lib/purchase-orders";
import { useResource } from "@/lib/use-resource";
import { PurchaseOrderFormDrawer } from "./purchase-order-form-drawer";

export function PurchaseOrderDetail({ id }: { id: string }) {
  const { organization } = useWorkspace();
  if (!organization) return <NoOrganization />;
  return <ScopedPurchaseOrderDetail key={organization.id} id={id} organizationId={organization.id} />;
}

function ScopedPurchaseOrderDetail({ id, organizationId }: { id: string; organizationId: number }) {
  const router = useRouter();
  const { organization, can, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const url = `${purchaseOrdersRoot(organizationId)}/${id}`;
  const resource = useResource<{ data: PurchaseOrder }>(url);

  async function issue() {
    setBusy(true);
    setError("");
    try {
      await api.post(`${url}/issue`);
      resource.reload();
      setRefreshToken((value) => value + 1);
      notify("Purchase order marked as issued.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (resource.error) {
    return (
      <RecordDrawerShell onClose={() => router.push("/purchase-orders")} ariaLabel="Purchase order error">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold text-slate-500">Purchase Order</span>
          <Button variant="ghost" size="sm" onClick={() => router.push("/purchase-orders")} className="gap-1.5 text-slate-600 hover:text-slate-900" aria-label="Close workspace">
            <X size={16} />
            <span>Close workspace</span>
          </Button>
        </div>
        <div className="p-6">
          <ErrorBox message={resource.error} />
        </div>
      </RecordDrawerShell>
    );
  }
  if (!resource.data || !organization) {
    return (
      <RecordDrawerShell onClose={() => router.push("/purchase-orders")} ariaLabel="Loading purchase order">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold text-slate-500">Loading order...</span>
          <Button variant="ghost" size="sm" onClick={() => router.push("/purchase-orders")} className="gap-1.5 text-slate-600 hover:text-slate-900" aria-label="Close workspace">
            <X size={16} />
            <span>Close workspace</span>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <Loading />
        </div>
      </RecordDrawerShell>
    );
  }
  const order = resource.data.data;
  const editable = order.status === "draft" && can("purchase_orders.manage");
  const total = (order.items ?? []).reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  const relatedRequest = {
    kind: "material-request" as const,
    id: order.material_request_id,
    label: order.material_request?.request_number ?? `Request #${order.material_request_id}`,
    title: order.material_request?.title ?? "Material request",
    href: `/material-requests/${order.material_request_id}`,
  };

  return (
    <RecordWorkspace
      organizationId={organizationId} kind="purchase-order" id={order.id}
      number={order.po_number} title={order.supplier_name}
      subtitle={`From ${order.material_request?.request_number ?? "material request"} · Created ${formatDate(order.created_at, organization.timezone)}`}
      status={order.status} listHref="/purchase-orders" apiUrl={url}
      canManage={can("purchase_orders.manage")} externalError={error} refreshToken={refreshToken}
      actions={editable ? (
        <><PurchaseOrderFormDrawer purchaseOrder={order} onSaved={() => { resource.reload(); setRefreshToken((value) => value + 1); }} /><Button onClick={issue} disabled={busy}><Send size={15} /> Mark as issued</Button></>
      ) : <RelatedRecordButton organizationId={organizationId} record={relatedRequest}>Open {relatedRequest.label}</RelatedRecordButton>}
      overview={
        <>
          <RecordPanel title="Order progress" description="Draft and issue the supplier order.">
            <RecordProgress steps={["Draft purchase order", "Purchase order issued"]} current={order.status === "draft" ? 0 : 1} />
          </RecordPanel>
          <RecordPanel title="Purchase order details">
            <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <RecordField label="PO number">{order.po_number}</RecordField>
              <RecordField label="Supplier">{order.supplier_name}</RecordField>
              <RecordField label="Currency">{order.currency}</RecordField>
              <RecordField label="Expected delivery">{order.expected_delivery_date?.slice(0, 10) ?? "Not set"}</RecordField>
              <RecordField label="Created by">{order.created_by?.name ?? "—"}</RecordField>
              <RecordField label="Issued">{order.issued_at ? formatDate(order.issued_at, organization.timezone) : "Not yet"}</RecordField>
              <RecordField label="Materials">{order.items?.length ?? 0}</RecordField>
              <RecordField label="Order total">{order.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</RecordField>
            </dl>
          </RecordPanel>
          <RecordPanel title="Source material request" description="Open the request in another workspace tab.">
            <RelatedRecordButton organizationId={organizationId} record={relatedRequest}>Open {relatedRequest.label}</RelatedRecordButton>
          </RecordPanel>
          <RecordPanel title="Notes to supplier"><p className="whitespace-pre-wrap text-sm text-slate-700">{order.notes || "No notes added."}</p></RecordPanel>
        </>
      }
      materials={
        <RecordPanel title="Ordered materials" description="Quantity and unit price for each requested item.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Material</TableHead><TableHead>Specification</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{order.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.line_number}</TableCell><TableCell className="font-medium">{item.description}</TableCell><TableCell>{item.specification ?? "—"}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell><TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{(Number(item.quantity) * Number(item.unit_price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        </RecordPanel>
      }
    />
  );
}
