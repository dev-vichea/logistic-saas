"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Landmark,
  Plus,
  ArrowRight,
  TrendingDown,
  Layers,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { ColDef } from "ag-grid-community";
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
  FilterPill,
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function CustomsDashboard() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [laneFilter, setLaneFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");
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

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<CustomsDeclaration>[]>(
    () => [
      {
        field: "declaration_number",
        headerName: "Declaration (SAD)",
        minWidth: 190,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight">
              <Link
                href={`/customs/${d.id}`}
                className="font-mono font-bold text-blue-900 hover:underline text-xs leading-none"
              >
                {d.declaration_number}
              </Link>
              <div className="text-[10px] text-slate-400 mt-1 leading-none">
                {d.declaration_date} &bull; <span className="uppercase font-medium">{d.declaration_type}</span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "Office & Regime",
        width: 150,
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight text-xs">
              <span className="font-semibold text-slate-800 leading-none">{d.customs_office_code}</span>
              <span className="text-[10px] text-slate-400 mt-1 leading-none">{d.regime_code}</span>
            </div>
          );
        },
      },
      {
        field: "inspection_lane",
        headerName: "Inspection Lane",
        width: 150,
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
      {
        headerName: "Linked Reference",
        minWidth: 170,
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight text-xs">
              {d.shipment ? (
                <span className="font-mono text-slate-800 font-medium leading-none">{d.shipment.shipment_number}</span>
              ) : (
                <span className="text-slate-400 italic leading-none">Direct Entry</span>
              )}
              <div className="text-[10px] text-slate-400 mt-1 leading-none truncate">
                {d.invoice_number && `Inv: ${d.invoice_number}`}
                {d.bill_of_lading_number && ` | BL: ${d.bill_of_lading_number}`}
              </div>
            </div>
          );
        },
      },
      {
        field: "customs_value_usd",
        headerName: "Customs Valuation",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight text-xs">
              <span className="font-mono font-semibold text-slate-900 leading-none">
                ${parseFloat(String(d.customs_value_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 leading-none">
                {d.total_packages} pkgs &bull; {parseFloat(String(d.total_gross_weight_kg || 0)).toLocaleString()} kg
              </span>
            </div>
          );
        },
      },
      {
        field: "duty_exemption_amount_usd",
        headerName: "Duty Exemption (CDC)",
        width: 160,
        cellRenderer: (params: CustomCellRendererProps<CustomsDeclaration>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-0.5 leading-tight text-xs">
              <span className="font-mono font-semibold text-emerald-700 leading-none">
                ${parseFloat(String(d.duty_exemption_amount_usd || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              {d.cdc_master_list && (
                <span className="text-[10px] text-indigo-600 truncate mt-1 leading-none block">
                  QIP #{d.cdc_master_list.qip_number}
                </span>
              )}
            </div>
          );
        },
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
        width: 100,
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
    ],
    []
  );

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

  const declarations = declarationsRes.data?.data || [];

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
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
              <FilterPill
                label="Clearance Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Clearance Statuses" },
                  ...(catalog.declaration_statuses?.map((st) => ({
                    value: st.value,
                    label: st.label,
                  })) || []),
                ]}
                onChange={setStatusFilter}
              />
              <FilterPill
                label="Customs Office"
                value={officeFilter}
                options={[
                  { value: "all", label: "All Customs Offices" },
                  ...(catalog.customs_offices?.map((off) => ({
                    value: off.code,
                    label: `${off.code} - ${off.name}`,
                  })) || []),
                ]}
                onChange={setOfficeFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest declaration" },
                  { value: "value", label: "Customs valuation" },
                  { value: "duty", label: "Duty exemption" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
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
            <Layers size={13} className="text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-indigo-700 mt-0.5">{stats.total_cdc_lists}</div>
          <div className="text-[10px] text-slate-400">
            <Link href="/customs/cdc" className="text-blue-900 hover:underline">
              View QIP quotas &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Declarations List: AG Grid or Classic Table */}
      {declarations.length === 0 ? (
        <div className="p-6">
          <Empty
            title="No customs declarations found"
            description={
              search || laneFilter !== "all" || statusFilter !== "all" || officeFilter !== "all"
                ? "No declarations match your active search filters."
                : "Lodge your first ASYCUDA Single Administrative Document (SAD) declaration or link one from your active shipments."
            }
            action={
              can("customs.declare") ? (
                <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-blue-900 text-white">
                  <Plus className="w-4 h-4" />
                  Lodge ASYCUDA SAD
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        /* AG Grid Enterprise View (Edge-to-Edge) */
        <div className="flex-1 min-h-0 w-full flex flex-col">
          <MekongDataGrid<CustomsDeclaration>
            rowData={declarations}
            columnDefs={columnDefs}
            fullScreen={true}
            title="ASYCUDA SAD Declarations"
            quickFilterPlaceholder="Quick search in declarations..."
          />
        </div>
      )}

      {dialogOpen && (
        <NewDeclarationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          catalog={catalog}
          onCreated={() => declarationsRes.reload()}
        />
      )}
    </div>
  );
}
