"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { Empty, ErrorBox, Loading, NoOrganization, Pagination, formatDate } from "@/components/common";
import { WorkspaceHeaderSlot } from "@/components/navigation/header-context";
import { Badge } from "@/components/ui/badge";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { useResource } from "@/lib/use-resource";
import { materialRequestsRoot, type MaterialRequest } from "@/lib/material-requests";
import type { Paginated } from "@/lib/types";
import { MaterialRequestFormDrawer } from "./material-request-form-drawer";

const tabs = [
  { id: "all", label: "All requests" },
  { id: "draft", label: "Draft" },
  { id: "submitted", label: "Submitted" },
];

export function MaterialRequestList() {
  const { organization } = useWorkspace();
  if (!organization) return <NoOrganization />;
  return <ScopedMaterialRequestList key={organization.id} organizationId={organization.id} />;
}

function ScopedMaterialRequestList({ organizationId }: { organizationId: number }) {
  const { organization, can } = useWorkspace();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), per_page: "25" });
  if (status !== "all") query.set("status", status);
  if (search.trim()) query.set("q", search.trim());
  const resource = useResource<Paginated<MaterialRequest>>(
    `${materialRequestsRoot(organizationId)}?${query.toString()}`,
  );
  const action = useMemo(
    () => <MaterialRequestFormDrawer onSaved={resource.reload} />,
    [resource.reload],
  );
  const columns = useMemo<ColDef<MaterialRequest>[]>(() => [
    {
      field: "request_number",
      headerName: "Request #",
      width: 155,
      pinned: "left",
      cellRenderer: ({ data }: CustomCellRendererProps<MaterialRequest>) => data ? (
        <Link href={`/material-requests/${data.id}`} className="font-mono text-xs font-semibold text-blue-900 hover:underline">
          {data.request_number}
        </Link>
      ) : null,
    },
    { field: "title", headerName: "Request", minWidth: 230, flex: 1 },
    { field: "items_count", headerName: "Materials", width: 105 },
    {
      headerName: "Purchase order", width: 160,
      cellRenderer: ({ data }: CustomCellRendererProps<MaterialRequest>) => data?.purchase_order ? (
        <Link href={`/purchase-orders/${data.purchase_order.id}`} className="font-mono text-xs font-semibold text-blue-900 hover:underline">{data.purchase_order.po_number}</Link>
      ) : "—",
    },
    { field: "needed_by", headerName: "Needed by", width: 130, valueFormatter: ({ value }) => value ? String(value).slice(0, 10) : "—" },
    { headerName: "Requested by", width: 155, valueGetter: ({ data }) => data?.requested_by?.name ?? "—" },
    { field: "created_at", headerName: "Created", width: 130, valueFormatter: ({ value }) => value && organization ? formatDate(String(value), organization.timezone) : "—" },
    {
      field: "status",
      headerName: "Status",
      width: 115,
      pinned: "right",
      cellRenderer: ({ data }: CustomCellRendererProps<MaterialRequest>) => data ? (
        <Badge variant={data.status === "submitted" ? "secondary" : "outline"}>
          {data.status === "submitted" ? "Submitted" : "Draft"}
        </Badge>
      ) : null,
    },
  ], [organization]);

  if (resource.error) return <ErrorBox message={resource.error} />;

  return (
    <>
      <WorkspaceHeaderSlot
        fullWidth
        title="Material Requests"
        icon={ClipboardList}
        tabs={tabs}
        activeTab={status}
        onTabChange={(value) => { setStatus(value); setPage(1); }}
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search request number or title..."
        primaryAction={can("material_requests.manage") ? action : null}
      />
      {!resource.data ? <Loading /> : resource.data.data.length === 0 ? (
        <div className="p-8">
          <Empty
            title="No material requests found"
            description="Create a request to list the materials your team needs."
            action={can("material_requests.manage") ? action : null}
          />
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <MekongDataGrid<MaterialRequest>
            rowData={resource.data.data}
            columnDefs={columns}
            title="Material Requests"
            quickFilterPlaceholder="Filter visible requests..."
            enableSelection={false}
          />
          <Pagination
            page={resource.data.current_page}
            last={resource.data.last_page}
            onChange={setPage}
          />
        </div>
      )}
    </>
  );
}
