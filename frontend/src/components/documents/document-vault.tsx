"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { type ColDef } from "ag-grid-community";
import { type CustomCellRendererProps } from "ag-grid-react";
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  documentsRoot,
  documentTypeLabel,
  type TradeDocument,
  type DocumentCatalog,
  type TradeDocumentType,
} from "@/lib/documents";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { UploadDocumentDialog } from "./upload-document-dialog";
import {
  WorkspaceHeaderSlot,
  FilterPill,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function DocumentVault() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");

  const catalogRes = useResource<{ data: DocumentCatalog }>(
    organization ? `${documentsRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("search", search.trim());
  if (typeFilter && typeFilter !== "all") queryParams.set("document_type", typeFilter);
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);

  const documentsRes = useResource<Paginated<TradeDocument>>(
    organization ? `${documentsRoot(organization.id)}?${queryParams.toString()}` : null
  );

  const rawCatalog = catalogRes.data as { data?: DocumentCatalog } | DocumentCatalog | undefined;
  const catalog: DocumentCatalog = (rawCatalog && "data" in rawCatalog && rawCatalog.data
    ? rawCatalog.data
    : (rawCatalog as DocumentCatalog)) || {
    stats: {
      total_documents: 0,
      reconciled: 0,
      flagged: 0,
      verified: 0,
      total_reconciliations: 0,
      unresolved_reconciliations: 0,
    },
    shipments: [],
    document_types: [],
  };
  const stats = catalog.stats || {
    total_documents: 0,
    reconciled: 0,
    flagged: 0,
    verified: 0,
    total_reconciliations: 0,
    unresolved_reconciliations: 0,
  };
  const documents = documentsRes.data?.data || [];

  const handleDelete = useCallback(
    async (docId: number) => {
      if (!organization) return;
      if (!confirm("Are you sure you want to delete this document from the vault?")) return;
      try {
        await api.delete(`${documentsRoot(organization.id)}/${docId}`);
        documentsRes.reload();
        catalogRes.reload();
      } catch (err: unknown) {
        alert(errorMessage(err));
      }
    },
    [organization, documentsRes, catalogRes]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-purple-50 text-purple-800 border-purple-200 flex items-center gap-1">
            <ShieldCheck className="size-3" />
            Verified
          </Badge>
        );
      case "reconciled":
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Reconciled
          </Badge>
        );
      case "flagged":
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
            <AlertTriangle className="size-3" />
            Discrepancies
          </Badge>
        );
      case "parsed":
        return (
          <Badge className="bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-1">
            <FileSpreadsheet className="size-3" />
            AI Parsed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-slate-300 text-slate-700">
            {status}
          </Badge>
        );
    }
  };

  const getTypeLabel = (type: TradeDocumentType) => {
    return <span className="text-xs font-medium text-slate-700">{documentTypeLabel(type)}</span>;
  };

  const columnDefs = useMemo<ColDef<TradeDocument>[]>(
    () => [
      {
        headerName: "DOCUMENT / FILE",
        field: "document_number",
        minWidth: 260,
        flex: 1.5,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1 leading-tight">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileText className="size-3.5 text-blue-900 shrink-0" />
                <span className="truncate">{doc.document_number || "Document #" + doc.id}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                {doc.file_name}
              </div>
            </div>
          );
        },
      },
      {
        headerName: "TYPE",
        field: "document_type",
        width: 170,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          return <div className="flex items-center h-full">{getTypeLabel(doc.document_type)}</div>;
        },
      },
      {
        headerName: "LINKED SHIPMENT",
        minWidth: 190,
        flex: 1,
        valueGetter: (params) => params.data?.shipment?.shipment_number || "",
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          if (doc.shipment) {
            return (
              <div className="flex items-center h-full">
                <Link
                  href={`/freight/shipments/${doc.shipment.id}`}
                  className="font-medium text-blue-900 hover:text-blue-800 text-xs flex items-center gap-1"
                >
                  <span>{doc.shipment.shipment_number}</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            );
          }
          return <span className="text-xs text-slate-400 italic flex items-center h-full">Unlinked</span>;
        },
      },
      {
        headerName: "ITEMS",
        width: 110,
        valueGetter: (params) => params.data?.items_count ?? params.data?.items?.length ?? 0,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          const count = doc.items_count ?? doc.items?.length ?? 0;
          return (
            <div className="flex items-center h-full">
              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-mono">
                {count} lines
              </span>
            </div>
          );
        },
      },
      {
        headerName: "AI CONFIDENCE",
        field: "confidence_score",
        width: 170,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          const pct = Math.min(100, Number(doc.confidence_score) || 95);
          return (
            <div className="flex items-center gap-2 h-full">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shrink-0">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 font-mono">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        },
      },
      {
        headerName: "STATUS",
        field: "status",
        width: 150,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          return <div className="flex items-center h-full">{getStatusBadge(doc.status)}</div>;
        },
      },
      {
        headerName: "ACTIONS",
        width: 130,
        pinned: "right",
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          return (
            <div className="flex items-center justify-end gap-1.5 h-full">
              <Link href={`/documents/${doc.id}`}>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-900 hover:text-blue-800 hover:bg-blue-50">
                  Inspect
                </Button>
              </Link>
              {can("documents.delete") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="size-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [can, handleDelete]
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (documentsRes.error) return <ErrorBox message={documentsRes.error} />;
  if (!catalogRes.data) return <Loading />;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="Trade Documents"
        icon={FileText}
        tabs={[
          { id: "all", label: "All Vault", count: stats.total_documents },
          { id: "commercial_invoice", label: "Invoices" },
          { id: "packing_list", label: "Packing Lists" },
          { id: "bill_of_lading", label: "Bills of Lading" },
          { id: "cdc_master_list", label: "CDC Master Lists" },
        ]}
        activeTab={typeFilter}
        onTabChange={setTypeFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search document #, trader, reference..."
        primaryAction={
          <div className="flex items-center gap-2">
            <Link href="/documents/reconciliation">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              >
                <Scale size={13} />
                <span className="hidden sm:inline">Reconciliation</span>
              </Button>
            </Link>
            {can("documents.upload") && (
              <UploadDocumentDialog
                catalog={catalog}
                onUploaded={() => {
                  documentsRes.reload();
                  catalogRes.reload();
                }}
              />
            )}
          </div>
        }
        subHeader={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
              <FilterPill
                label="Document Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "parsed", label: "AI Parsed" },
                  { value: "reconciled", label: "Reconciled" },
                  { value: "flagged", label: "Flagged Discrepancies" },
                  { value: "verified", label: "Verified" },
                ]}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest uploaded" },
                  { value: "number", label: "Document number" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {/* KPI Overview Cards */}
      <div className="px-4 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0 bg-slate-50/50 border-b border-slate-200/60">
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Documents</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total_documents}</div>
          <div className="text-[10px] text-slate-400">Across active shipments</div>
        </div>
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">Verified Documents</div>
          <div className="text-xl font-bold text-purple-900 mt-0.5">{stats.verified}</div>
          <div className="text-[10px] text-purple-600">Audited & confirmed</div>
        </div>
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Reconciled Cleanly</div>
          <div className="text-xl font-bold text-emerald-900 mt-0.5">{stats.reconciled}</div>
          <div className="text-[10px] text-emerald-600">Invoice vs Packing matched</div>
        </div>
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Discrepancy Flags</div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">{stats.flagged}</div>
          <div className="text-[10px] text-amber-600">Weight / qty diffs found</div>
        </div>
      </div>

      {/* Documents AG Grid */}
      {documents.length === 0 ? (
        <div className="p-8">
          <Empty
            title="No Trade Documents Found"
            description={
              search || typeFilter !== "all" || statusFilter !== "all"
                ? "No documents match your active search filters."
                : "Upload commercial invoices, packing lists, or B/Ls to start automated extraction and cross-reconciliation."
            }
            action={
              can("documents.upload") ? (
                <UploadDocumentDialog
                  catalog={catalog}
                  onUploaded={() => {
                    documentsRes.reload();
                    catalogRes.reload();
                  }}
                />
              ) : undefined
            }
          />
        </div>
      ) : (
        <MekongDataGrid<TradeDocument>
          rowData={documents}
          columnDefs={columnDefs}
          title="Trade Document Vault"
          quickFilterPlaceholder="Quick search document #, trader..."
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
