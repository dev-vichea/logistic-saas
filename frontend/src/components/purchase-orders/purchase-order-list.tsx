"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { Empty, ErrorBox, Loading, NoOrganization, Pagination, formatDate } from "@/components/common";
import { WorkspaceHeaderSlot } from "@/components/navigation/header-context";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { useResource } from "@/lib/use-resource";
import { purchaseOrdersRoot, type PurchaseOrder } from "@/lib/purchase-orders";
import type { Paginated } from "@/lib/types";
import { PurchaseOrderFormDrawer } from "./purchase-order-form-drawer";

const tabs = [
  { id: "all", label: "All orders" },
  { id: "draft", label: "Draft" },
  { id: "issued", label: "Issued" },
];

export function PurchaseOrderList() {
  const { organization } = useWorkspace();
  if (!organization) return <NoOrganization />;
  return <ScopedPurchaseOrderList key={organization.id} organizationId={organization.id} />;
}

function ScopedPurchaseOrderList({ organizationId }: { organizationId: number }) {
  const router = useRouter();
  const { organization, can } = useWorkspace();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), per_page: "25" });
  if (status !== "all") query.set("status", status);
  if (search.trim()) query.set("q", search.trim());
  const resource = useResource<Paginated<PurchaseOrder>>(`${purchaseOrdersRoot(organizationId)}?${query.toString()}`);
  const action = useMemo(
    () => <PurchaseOrderFormDrawer onSaved={(order) => router.push(`/purchase-orders/${order.id}`)} />,
    [router],
  );
  const columns = useMemo<ColDef<PurchaseOrder>[]>(() => [
    {
      field: "po_number", headerName: "PO #", width: 155, pinned: "left",
      cellRenderer: ({ data }: CustomCellRendererProps<PurchaseOrder>) => data ? (
        <Link href={`/purchase-orders/${data.id}`} className="font-mono text-xs font-semibold text-blue-900 hover:underline">{data.po_number}</Link>
      ) : null,
    },
    { field: "supplier_name", headerName: "Supplier", minWidth: 190, flex: 1 },
    { headerName: "Material request", width: 170, valueGetter: ({ data }) => data?.material_request?.request_number ?? "—" },
    { field: "items_count", headerName: "Materials", width: 105 },
    { headerName: "Total", width: 155, valueGetter: ({ data }) => data ? `${data.currency} ${Number(data.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" },
    { field: "expected_delivery_date", headerName: "Expected", width: 130, valueFormatter: ({ value }) => value ? String(value).slice(0, 10) : "—" },
    { field: "created_at", headerName: "Created", width: 130, valueFormatter: ({ value }) => value && organization ? formatDate(String(value), organization.timezone) : "—" },
    {
      field: "status", headerName: "Status", width: 110, pinned: "right",
      cellRenderer: ({ data }: CustomCellRendererProps<PurchaseOrder>) => data ? (
        <Badge variant={data.status === "issued" ? "secondary" : "outline"}>{data.status === "issued" ? "Issued" : "Draft"}</Badge>
      ) : null,
    },
  ], [organization]);

  if (resource.error) return <ErrorBox message={resource.error} />;

  return (
    <>
      <WorkspaceHeaderSlot
        fullWidth title="Purchase Orders" icon={FileText}
        tabs={tabs} activeTab={status}
        onTabChange={(value) => { setStatus(value); setPage(1); }}
        searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search PO, request or supplier..."
        primaryAction={can("purchase_orders.manage") ? action : null}
      />
      {!resource.data ? <Loading /> : resource.data.data.length === 0 ? (
        <div className="p-8">
          <Empty title="No purchase orders found" description="Create a PO from a submitted material request." action={can("purchase_orders.manage") ? action : null} />
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <MekongDataGrid<PurchaseOrder>
            rowData={resource.data.data} columnDefs={columns} title="Purchase Orders"
            quickFilterPlaceholder="Filter visible orders..." enableSelection={false}
          />
          <Pagination page={resource.data.current_page} last={resource.data.last_page} onChange={setPage} />
        </div>
      )}
    </>
  );
}
