"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { type ColDef, type ColGroupDef } from "ag-grid-community";
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
import {
  NoOrganization,
  Loading,
  ErrorBox,
  Empty,
  Pagination,
} from "@/components/common";
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
import { Input } from "@/components/ui/input";
import { UploadDocumentDialog } from "./upload-document-dialog";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function DocumentVault({ verifiedOnly = false }: { verifiedOnly?: boolean }) {
  const { organization, can } = useWorkspace();
  const allowed = can("documents.view");
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");
  const [page, setPage] = useState(1);

  const catalogRes = useResource<{ data: DocumentCatalog }>(
    organization && allowed ? `${documentsRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("search", search.trim());
  if (typeFilter && typeFilter !== "all") queryParams.set("document_type", typeFilter);
  if (verifiedOnly) {
    queryParams.set("status", "verified");
    queryParams.set("page", String(page));
  } else if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const documentsRes = useResource<Paginated<TradeDocument>>(
    organization && allowed ? `${documentsRoot(organization.id)}?${queryParams.toString()}` : null
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
  const rawDocuments = useMemo(
    () => documentsRes.data?.data || [],
    [documentsRes.data?.data]
  );

  const hasActiveFilters =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setPage(1);
    setTypeFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setSearch("");
  };

  const updateSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const documents = useMemo(() => {
    return rawDocuments.filter((doc) => {
      if (dateFilter !== "all" && doc.created_at) {
        const d = new Date(doc.created_at);
        const now = new Date();
        if (dateFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this_week") {
          const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diff < -1 || diff > 7) return false;
        } else if (dateFilter === "this_month") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [rawDocuments, dateFilter]);

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

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<TradeDocument> | ColGroupDef<TradeDocument>)[]>(() => {
    const allCols: (ColDef<TradeDocument> | ColGroupDef<TradeDocument>)[] = [
      {
        headerName: "Document File",
        field: "document_number",
        width: verifiedOnly ? 220 : 175,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          const reference = doc.document_number || doc.file_name;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <FileText className="size-3.5 text-blue-900 shrink-0" />
              {verifiedOnly ? (
                <Link
                  href={`/documents/${doc.id}`}
                  title={reference}
                  className="truncate text-sm font-semibold text-accent-foreground underline-offset-4 hover:underline"
                >
                  {reference}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900 text-xs truncate">
                  {doc.document_number || "Doc #" + doc.id}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Classification",
        headerClass: "ag-group-shipper",
        children: [
          {
            headerName: "Type",
            field: "document_type",
            width: 155,
            cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
              const doc = params.data;
              if (!doc) return null;
              return <div className="flex items-center h-full">{getTypeLabel(doc.document_type)}</div>;
            },
          },
          {
            headerName: "Linked Shipment",
            minWidth: 160,
            flex: 1.1,
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
        ],
      },
      {
        headerName: "AI Parsing & Quality",
        headerClass: "ag-group-service",
        children: [
          {
            headerName: "Lines",
            width: 95,
            valueGetter: (params) => params.data?.items_count ?? params.data?.items?.length ?? 0,
            cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
              const doc = params.data;
              if (!doc) return null;
              const count = doc.items_count ?? doc.items?.length ?? 0;
              return (
                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                  {count} lines
                </span>
              );
            },
          },
          {
            headerName: "AI Confidence",
            field: "confidence_score",
            width: 145,
            cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
              const doc = params.data;
              if (!doc) return null;
              const pct = Math.min(100, Number(doc.confidence_score) || 95);
              return (
                <div className="flex items-center gap-2 h-full">
                  <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shrink-0">
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
        ],
      },
      {
        headerName: "Reconciliation",
        headerClass: "ag-group-schedule",
        children: [
          {
            headerName: "Status",
            field: "status",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
              const doc = params.data;
              if (!doc) return null;
              return <div className="flex items-center h-full">{getStatusBadge(doc.status)}</div>;
            },
          },
        ],
      },
      {
        headerName: "Actions",
        width: 140,
        pinned: "right",
        sortable: false,
        filter: false,
        cellRenderer: (params: CustomCellRendererProps<TradeDocument>) => {
          const doc = params.data;
          if (!doc) return null;
          return (
            <div className="flex items-center justify-end gap-1.5 h-full">
              <Link href={`/documents/${doc.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-blue-900 hover:text-blue-800 hover:bg-blue-50 px-2"
                >
                  View
                </Button>
              </Link>
              {can("documents.upload") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete Document"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];

    if (verifiedOnly) {
      return allCols.filter(
        (col) => col.headerName !== "AI Parsing & Quality" && col.headerName !== "Actions",
      );
    }
    if (activeView === "reconciliation") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Document File", "AI Parsing & Quality", "Reconciliation", "Actions"].includes(name || "");
      });
    }
    if (activeView === "classification") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Document File", "Classification", "Reconciliation", "Actions"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView, can, handleDelete, verifiedOnly]);

  if (!organization) return <NoOrganization />;
  if (!allowed)
    return <ErrorBox message="You do not have access to trade documents." />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (!catalogRes.data) return <Loading />;

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
      {verifiedOnly && <h1 className="sr-only">Document Library</h1>}
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title={verifiedOnly ? "Document Library" : "Document Vault"}
        icon={FileText}
        tabs={verifiedOnly ? undefined : [
          { id: "all", label: "All Documents", count: stats.total_documents },
          { id: "reconciled", label: "Reconciled", count: stats.reconciled },
          { id: "flagged", label: "Discrepancies", count: stats.flagged || undefined },
          { id: "verified", label: "Verified", count: stats.verified },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={verifiedOnly ? undefined : updateSearch}
        searchPlaceholder="Search document number, file name, shipment..."
        primaryAction={verifiedOnly ? (
          <Button asChild variant="outline">
            <Link href="/documents" aria-label="Document inbox">Inbox</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/documents/reconciliation">
              <Button variant="outline" className="gap-1.5 h-9 text-xs">
                <Scale size={14} className="text-blue-900" />
                <span>Reconciliation Engine</span>
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
        )}
        subHeader={
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              {verifiedOnly ? (
                <Input
                  type="search"
                  aria-label="Search document number or file name"
                  placeholder="Search documents…"
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  className="h-9 w-full placeholder:text-muted-foreground sm:w-52"
                />
              ) : (
                <FloatingFilterSelect
                  label="Status"
                  value={statusFilter}
                  allLabel="All Statuses"
                  options={[
                    { value: "parsed", label: "AI Parsed" },
                    { value: "reconciled", label: "Reconciled" },
                    { value: "flagged", label: "Flagged Discrepancies" },
                    { value: "verified", label: "Verified" },
                  ]}
                  onChange={setStatusFilter}
                  minWidth="min-w-[125px]"
                />
              )}
              <FloatingFilterSelect
                label="Doc Type"
                value={typeFilter}
                allLabel="All Types"
                options={catalog.document_types || []}
                onChange={(value) => {
                  setPage(1);
                  setTypeFilter(value);
                }}
                minWidth="min-w-[130px]"
              />
              {!verifiedOnly && (
                <FloatingDateFilter
                  label="Uploaded"
                  value={dateFilter}
                  onChange={setDateFilter}
                />
              )}
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            {!verifiedOnly && (
              <div className="flex items-center gap-2 shrink-0">
                <ViewPresetSelector
                  activeView={activeView}
                  presets={[
                    { id: "default", label: "Default View", desc: "All files, shipments & AI parsing" },
                    { id: "reconciliation", label: "Reconciliation & Audit", desc: "Status & AI confidence" },
                    { id: "classification", label: "Classification", desc: "Document types & shipments" },
                  ]}
                  onSelectView={setActiveView}
                />
                <ViewSettingsButton onClick={resetAllFilters} />
              </div>
            )}
          </>
        }
      />

      {/* KPI Overview Cards */}
      {!verifiedOnly && <div className="px-4 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0 bg-slate-50/50 border-b border-slate-200/60">
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Documents</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total_documents}</div>
          <div className="text-[10px] text-slate-400">Across active shipments</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reconciled</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{stats.reconciled}</div>
          <div className="text-[10px] text-slate-400">Zero variance across documents</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Flagged Discrepancies</div>
          <div className="text-xl font-bold text-amber-700 mt-0.5">{stats.flagged}</div>
          <div className="text-[10px] text-slate-400">Requires manual reconciliation</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verified & Stamped</div>
          <div className="text-xl font-bold text-purple-700 mt-0.5">{stats.verified}</div>
          <div className="text-[10px] text-slate-400">Audited for customs lodging</div>
        </div>
      </div>}

      {/* Main Content: Full-Bleed AG Grid Table */}
      {documentsRes.error ? (
        <div className="p-6">
          <ErrorBox message={documentsRes.error} />
        </div>
      ) : !documentsRes.data ? (
        <Loading />
      ) : documents.length === 0 ? (
        <div className="p-6">
          <Empty
            title={verifiedOnly ? "No verified documents" : "No documents in vault"}
            description={
              search || hasActiveFilters
                ? "No trade documents match your active search or filter selection."
                : verifiedOnly
                  ? "Verified documents appear here. Open the inbox to review documents that still need verification."
                  : "Upload commercial invoices, packing lists, and bills of lading to extract line items with OCR."
            }
            action={
              !verifiedOnly && can("documents.upload") ? (
                <UploadDocumentDialog
                  catalog={catalog}
                  onUploaded={() => {
                    documentsRes.reload();
                    catalogRes.reload();
                  }}
                />
              ) : null
            }
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<TradeDocument>
            rowData={documents}
            columnDefs={columnDefs}
            title={verifiedOnly ? "Verified documents" : undefined}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in documents..."
            enableQuickFilter={!verifiedOnly}
            enableSelection={!verifiedOnly}
            showRowNumbers={!verifiedOnly}
            gridOptions={verifiedOnly ? { pagination: false } : undefined}
          />
        </div>
      )}
      {verifiedOnly && documentsRes.data && documentsRes.data.last_page > 1 && (
        <div className="shrink-0 border-t px-4 pb-4">
          <Pagination
            page={documentsRes.data.current_page}
            last={documentsRes.data.last_page}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
