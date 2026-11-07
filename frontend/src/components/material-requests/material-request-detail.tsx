"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { ErrorBox, Loading, NoOrganization, formatDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordField, RecordPanel, RecordProgress } from "@/components/record-workspace/record-sections";
import { openWorkspaceRecord, RecordDrawerShell, RecordWorkspace, RelatedRecordButton } from "@/components/record-workspace/record-workspace";
import { api, errorMessage } from "@/lib/api";
import { materialRequestsRoot, type MaterialRequest } from "@/lib/material-requests";
import { useResource } from "@/lib/use-resource";
import { MaterialRequestFormDrawer } from "./material-request-form-drawer";
import { PurchaseOrderFormDrawer } from "@/components/purchase-orders/purchase-order-form-drawer";

export function MaterialRequestDetail({ id }: { id: string }) {
  const { organization } = useWorkspace();
  if (!organization) return <NoOrganization />;
  return <ScopedMaterialRequestDetail key={organization.id} id={id} organizationId={organization.id} />;
}

function ScopedMaterialRequestDetail({ id, organizationId }: { id: string; organizationId: number }) {
  const router = useRouter();
  const { organization, can, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const url = `${materialRequestsRoot(organizationId)}/${id}`;
  const resource = useResource<{ data: MaterialRequest }>(url);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.post(`${url}/submit`);
      resource.reload();
      setRefreshToken((value) => value + 1);
      notify("Material request submitted.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (resource.error) {
    return (
      <RecordDrawerShell onClose={() => router.push("/material-requests")} ariaLabel="Material request error">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold text-slate-500">Material Request</span>
          <Button variant="ghost" size="sm" onClick={() => router.push("/material-requests")} className="gap-1.5 text-slate-600 hover:text-slate-900" aria-label="Close workspace">
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
      <RecordDrawerShell onClose={() => router.push("/material-requests")} ariaLabel="Loading material request">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold text-slate-500">Loading request...</span>
          <Button variant="ghost" size="sm" onClick={() => router.push("/material-requests")} className="gap-1.5 text-slate-600 hover:text-slate-900" aria-label="Close workspace">
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
  const request = resource.data.data;
  const editable = request.status === "draft" && can("material_requests.manage");
  const relatedOrder = request.purchase_order ? {
    kind: "purchase-order" as const,
    id: request.purchase_order.id,
    label: request.purchase_order.po_number,
    title: "Purchase order",
    href: `/purchase-orders/${request.purchase_order.id}`,
  } : null;
  const createOrder = request.status === "submitted" && !relatedOrder && can("purchase_orders.manage") ? (
    <PurchaseOrderFormDrawer
      materialRequest={request}
      onSaved={(order) => {
        openWorkspaceRecord(organizationId, { kind: "purchase-order", id: order.id, label: order.po_number, title: order.supplier_name, href: `/purchase-orders/${order.id}` });
        router.push(`/purchase-orders/${order.id}`);
      }}
    />
  ) : null;

  return (
    <RecordWorkspace
      organizationId={organizationId} kind="material-request" id={request.id}
      number={request.request_number} title={request.title}
      subtitle={`Requested by ${request.requested_by?.name ?? "your team"} · Created ${formatDate(request.created_at, organization.timezone)}`}
      status={request.status} listHref="/material-requests" apiUrl={url}
      canManage={can("material_requests.manage")} externalError={error} refreshToken={refreshToken}
      actions={editable ? (
        <><MaterialRequestFormDrawer request={request} onSaved={() => { resource.reload(); setRefreshToken((value) => value + 1); }} /><Button onClick={submit} disabled={busy}><Send size={15} /> Submit request</Button></>
      ) : relatedOrder ? (
        <RelatedRecordButton organizationId={organizationId} record={relatedOrder}>Open {relatedOrder.label}</RelatedRecordButton>
      ) : createOrder}
      overview={
        <>
          <RecordPanel title="Request progress" description="From material need to purchasing handoff.">
            <RecordProgress steps={["Draft request", "Submitted for purchasing"]} current={request.status === "draft" ? 0 : 1} />
          </RecordPanel>
          <RecordPanel title="Request details">
            <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <RecordField label="Request number">{request.request_number}</RecordField>
              <RecordField label="Requested by">{request.requested_by?.name ?? "—"}</RecordField>
              <RecordField label="Needed by">{request.needed_by?.slice(0, 10) ?? "Not set"}</RecordField>
              <RecordField label="Created">{formatDate(request.created_at, organization.timezone)}</RecordField>
              <RecordField label="Submitted">{request.submitted_at ? formatDate(request.submitted_at, organization.timezone) : "Not yet"}</RecordField>
              <RecordField label="Materials">{request.items?.length ?? 0}</RecordField>
            </dl>
          </RecordPanel>
          <RecordPanel title="Related purchase order" description="Continue the request with a supplier order.">
            {relatedOrder ? <RelatedRecordButton organizationId={organizationId} record={relatedOrder}>Open {relatedOrder.label}</RelatedRecordButton> : <p className="text-sm text-muted-foreground">{request.status === "submitted" ? "No purchase order linked yet. Use New purchase order above to continue." : "Submit this request before creating a purchase order."}</p>}
          </RecordPanel>
          <RecordPanel title="Notes"><p className="whitespace-pre-wrap text-sm text-slate-700">{request.notes || "No notes added."}</p></RecordPanel>
        </>
      }
      materials={
        <RecordPanel title="Requested materials" description="Quantities and specifications for this request.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Material</TableHead><TableHead>Specification</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
              <TableBody>{request.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.line_number}</TableCell><TableCell className="font-medium">{item.description}</TableCell><TableCell>{item.specification ?? "—"}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell><TableCell>{item.unit}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        </RecordPanel>
      }
    />
  );
}
