"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Landmark,
  Plus,
  ArrowRight,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  customsRoot,
  laneColor,
  declarationStatusInfo,
  type CustomsDeclaration,
  type CustomsCatalog,
} from "@/lib/customs";
import { type Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { NewDeclarationDialog } from "./new-declaration-dialog";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function CustomsDashboard() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [laneFilter, setLaneFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");
  const [dialogOpen, setDialogOpen] = useState(false);

  const catalogRes = useResource<{ data: CustomsCatalog }>(
    organization ? `${customsRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("search", search.trim());
  if (laneFilter && laneFilter !== "all") queryParams.set("inspection_lane", laneFilter);
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);
  if (officeFilter && officeFilter !== "all") queryParams.set("customs_office_code", officeFilter);

  const declarationsRes = useResource<Paginated<CustomsDeclaration>>(
    organization ? `${customsRoot(organization.id)}/declarations?${queryParams.toString()}` : null
  );

  const rawDeclarations = useMemo(
    () => declarationsRes.data?.data || [],
    [declarationsRes.data?.data]
  );

  const hasActiveFilters =
    laneFilter !== "all" ||
    statusFilter !== "all" ||
    officeFilter !== "all" ||
    dateFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setLaneFilter("all");
    setStatusFilter("all");
    setOfficeFilter("all");
    setDateFilter("all");
    setSearch("");
  };

  const declarations = useMemo(() => {
    return rawDeclarations.filter((d) => {
      if (dateFilter !== "all" && d.declaration_date) {
        const date = new Date(d.declaration_date);
        const now = new Date();
        if (dateFilter === "today") {
          if (date.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this_week") {
          const diff = (date.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diff < -1 || diff > 7) return false;
        } else if (dateFilter === "this_month") {
          if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [rawDeclarations, dateFilter]);

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<CustomsDeclaration> | ColGroupDef<CustomsDeclaration>)[]>(() => {
    const allCols: (ColDef<CustomsDeclaration> | ColGroupDef<CustomsDeclaration>)[] = [
      {
        field: "declaration_number",
        headerName: "Declaration (SAD)",
        width: 165,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <Link
                href={`/customs/${d.id}`}
                className="font-mono font-bold text-blue-900 hover:underline text-xs leading-none"
              >
                {d.declaration_number}
              </Link>
              <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-100 px-1 py-0.5 rounded">
                {d.declaration_type}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Regime & Office",
        headerClass: "ag-group-shipper",
        children: [
          {
            field: "customs_office_code",
            headerName: "Office Code",
            width: 120,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              return <span className="font-semibold text-slate-800 text-xs">{d.customs_office_code}</span>;
            },
          },
          {
            field: "regime_code",
            headerName: "Regime",
            width: 100,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              return <span className="font-mono text-xs text-slate-600">{d.regime_code}</span>;
            },
          },
        ],
      },
      {
        headerName: "Inspection",
        headerClass: "ag-group-service",
        children: [
          {
            field: "inspection_lane",
            headerName: "Channel Lane",
            width: 135,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              const laneCfg = laneColor(d.inspection_lane);
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <span className={`size-2 rounded-full ${laneCfg?.border?.replace('border-', 'bg-') || 'bg-slate-400'}`} />
                    {laneCfg?.label || 'Unassigned'}
                  </span>
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Commercial Refs",
        headerClass: "ag-group-origin",
        children: [
          {
            headerName: "Linked Shipment",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              if (!d.shipment) return <span className="text-slate-400 text-xs italic">Direct Entry</span>;
              return <span className="font-mono text-slate-800 font-medium text-xs">{d.shipment.shipment_number}</span>;
            },
          },
          {
            headerName: "Invoice / B/L",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              return (
                <span className="text-xs text-slate-600 font-mono truncate">
                  {d.invoice_number ? `Inv: ${d.invoice_number}` : d.bill_of_lading_number ? `BL: ${d.bill_of_lading_number}` : "—"}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Valuation & CDC",
        headerClass: "ag-group-financial",
        children: [
          {
            field: "customs_value_usd",
            headerName: "Customs Valuation",
            width: 145,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              return (
                <span className="font-mono font-bold text-slate-900 text-xs">
                  ${parseFloat(String(d.customs_value_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              );
            },
          },
          {
            field: "duty_exemption_amount_usd",
            headerName: "CDC Exemption",
            width: 140,
            cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
              const d = params.data;
              if (!d) return null;
              return (
                <span className="font-mono font-semibold text-emerald-700 text-xs">
                  ${parseFloat(String(d.duty_exemption_amount_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              );
            },
          },
        ],
      },
      {
        field: "status",
        headerName: "Clearance Status",
        width: 140,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          const stCfg = declarationStatusInfo(d.status);
          return (
            <div className="flex items-center h-full">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${stCfg?.badge || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {stCfg?.label || 'Draft'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Action",
        width: 95,
        pinned: "right",
        sortable: false,
        filter: false,
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center justify-end h-full">
              <Link
                href={`/customs/${d.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-800 transition-colors"
              >
                View <ArrowRight className="size-3" />
              </Link>
            </div>
          );
        },
      },
    ];

    if (activeView === "inspection") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Declaration (SAD)", "Regime & Office", "Inspection", "Clearance Status", "Action"].includes(name || "");
      });
    }
    if (activeView === "cdc") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Declaration (SAD)", "Commercial Refs", "Valuation & CDC", "Clearance Status", "Action"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (declarationsRes.error) return <ErrorBox message={declarationsRes.error} />;
  if (!catalogRes.data) return <Loading />;

  const rawCatalog = catalogRes.data as { data?: CustomsCatalog } | CustomsCatalog | undefined;
  const catalog: CustomsCatalog = (rawCatalog && "data" in rawCatalog && rawCatalog.data
    ? rawCatalog.data
    : rawCatalog) as CustomsCatalog;

  const stats = catalog.stats || {
    total_declarations: 0,
    cleared_declarations: 0,
    under_inspection: 0,
    total_cdc_lists: 0,
    total_cdc_exemption_usd: 0,
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
      {/* Vektor TMS Flexible Header & Sub-Header Toolbar */}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="ASYCUDA Customs"
        icon={Landmark}
        tabs={[
          { id: "all", label: "All Declarations", count: stats.total_declarations },
          { id: "green", label: "Green Lane", count: undefined },
          { id: "blue", label: "Blue Lane (PCA)", count: undefined },
          { id: "yellow", label: "Yellow Lane", count: stats.under_inspection || undefined },
          { id: "red", label: "Red Lane", count: undefined },
        ]}
        activeTab={laneFilter}
        onTabChange={setLaneFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search SAD #, invoice, B/L..."
        primaryAction={
          can("customs.declare") ? (
            <Button
              onClick={() => setDialogOpen(true)}
              className="gap-1.5 shadow-2xs h-9 text-xs"
            >
              <Plus size={15} />
              Lodge SAD
            </Button>
          ) : null
        }
        subHeader={
          <>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingFilterSelect
                label="Status"
                value={statusFilter}
                allLabel="All Statuses"
                options={catalog.declaration_statuses?.map((st) => ({
                  value: st.value,
                  label: st.label,
                })) || []}
                onChange={setStatusFilter}
                minWidth="min-w-[120px]"
              />
              <FloatingFilterSelect
                label="Office"
                value={officeFilter}
                allLabel="All Offices"
                options={catalog.customs_offices?.map((off) => ({
                  value: off.code,
                  label: `${off.code} - ${off.name}`,
                })) || []}
                onChange={setOfficeFilter}
                minWidth="min-w-[130px]"
              />
              <FloatingFilterSelect
                label="Lane"
                value={laneFilter}
                allLabel="All Lanes"
                options={[
                  { value: "green", label: "Green Channel" },
                  { value: "blue", label: "Blue Channel" },
                  { value: "yellow", label: "Yellow Channel" },
                  { value: "red", label: "Red Channel" },
                ]}
                onChange={setLaneFilter}
                minWidth="min-w-[120px]"
              />
              <FloatingDateFilter
                label="Lodge Date"
                value={dateFilter}
                onChange={setDateFilter}
              />
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ViewPresetSelector
                activeView={activeView}
                presets={[
                  { id: "default", label: "Default View", desc: "All columns & valuation" },
                  { id: "inspection", label: "Inspection & Risk", desc: "Lane, office & status" },
                  { id: "cdc", label: "Valuation & CDC", desc: "Customs value & CDC exemptions" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
            </div>
          </>
        }
      />

      {/* KPI Overview Summary Row */}
      <div className="px-4 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0 bg-slate-50/50 border-b border-slate-200/60">
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Declarations</span>
            <Landmark size={13} className="text-blue-900" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total_declarations}</div>
          <div className="text-[10px] text-slate-400">ASYCUDA SAD filings</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Cleared & Released</span>
            <CheckCircle2 size={13} className="text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">{stats.cleared_declarations}</div>
          <div className="text-[10px] text-slate-400">Gate pass authorized</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Under Inspection</span>
            <AlertCircle size={13} className="text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-700 mt-0.5">{stats.under_inspection}</div>
          <div className="text-[10px] text-slate-400">Doc & scanner review</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Duty Exemption</span>
            <TrendingDown size={13} className="text-blue-900" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            ${stats.total_cdc_exemption_usd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-400">CDC QIP savings claimed</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">CDC Master Lists</span>
            <CheckCircle2 size={13} className="text-blue-900" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total_cdc_lists}</div>
          <div className="text-[10px] text-slate-400">Active tax exemptions</div>
        </div>
      </div>

      {/* Main Content: Full-Bleed AG Grid Table */}
      {!declarationsRes.data && !declarationsRes.error ? (
        <Loading />
      ) : declarations.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No declarations lodged"
            description={
              search || hasActiveFilters
                ? "No customs declarations match your active query or filters."
                : "Submit your first single administrative document (SAD) to track ASYCUDA World clearance channels."
            }
            action={
              can("customs.declare") ? (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="gap-1.5 shadow-2xs text-xs"
                >
                  <Plus size={14} />
                  Lodge SAD Declaration
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col">
          <MekongDataGrid<CustomsDeclaration>
            rowData={declarations}
            columnDefs={columnDefs}
            fullScreen={true}
            quickFilterPlaceholder="Quick search in declarations..."
          />
        </div>
      )}

      {dialogOpen && (
        <NewDeclarationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          catalog={catalog}
          onCreated={() => {
            declarationsRes.reload();
            catalogRes.reload();
          }}
        />
      )}
    </div>
  );
}
