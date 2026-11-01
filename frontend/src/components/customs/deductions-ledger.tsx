"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type ColDef, type ColGroupDef } from "ag-grid-community";
import { type CustomCellRendererProps } from "ag-grid-react";
import {
  ListChecks,
  MinusCircle,
  TrendingDown,
  User,
  ArrowRight,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  customsRoot,
  type CdcQuotaDeduction,
  type CustomsCatalog,
} from "@/lib/customs";
import { type Paginated } from "@/lib/types";
import { MekongDataGrid } from "@/components/ui/data-grid";
import {
  WorkspaceHeaderSlot,
  FloatingDateFilter,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function DeductionsLedger() {
  const { organization } = useWorkspace();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeView, setActiveView] = useState("default");

  const deductionsRes = useResource<Paginated<CdcQuotaDeduction>>(
    organization ? `${customsRoot(organization.id)}/deductions` : null
  );

  const catalogRes = useResource<{ data: CustomsCatalog }>(
    organization ? `${customsRoot(organization.id)}/catalog` : null
  );

  const rawCatalog = catalogRes.data as { data?: CustomsCatalog } | CustomsCatalog | undefined;
  const catalog: CustomsCatalog = (rawCatalog && "data" in rawCatalog && rawCatalog.data
    ? rawCatalog.data
    : rawCatalog) as CustomsCatalog;

  const rawDeductions = useMemo(
    () => deductionsRes.data?.data || [],
    [deductionsRes.data?.data]
  );

  const hasActiveFilters = dateFilter !== "all" || search.trim() !== "";

  const resetAllFilters = () => {
    setDateFilter("all");
    setSearch("");
  };

  const deductions = useMemo(() => {
    return rawDeductions.filter((ded) => {
      if (dateFilter !== "all" && ded.deducted_at) {
        const d = new Date(ded.deducted_at);
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
  }, [rawDeductions, dateFilter]);

  // AG Grid Column Definitions with Vektor TMS Tinted Group Headers (100% Single-Line)
  const columnDefs = useMemo<(ColDef<CdcQuotaDeduction> | ColGroupDef<CdcQuotaDeduction>)[]>(() => {
    const allCols: (ColDef<CdcQuotaDeduction> | ColGroupDef<CdcQuotaDeduction>)[] = [
      {
        headerName: "Deduction Ref",
        field: "deduction_reference",
        width: 155,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
          const ded = params.data;
          if (!ded) return null;
          return (
            <div className="flex items-center h-full">
              <span className="font-mono font-bold text-indigo-700 text-xs">
                {ded.deduction_reference}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Customs SAD Declaration",
        headerClass: "ag-group-shipper",
        children: [
          {
            headerName: "Declaration #",
            minWidth: 175,
            flex: 1.1,
            valueGetter: (params) => params.data?.customs_declaration?.declaration_number || "",
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded) return null;
              if (ded.customs_declaration) {
                return (
                  <div className="flex items-center gap-1.5 h-full">
                    <Link
                      href={`/customs/${ded.customs_declaration.id}`}
                      className="font-mono font-bold text-blue-900 hover:text-blue-700 text-xs flex items-center gap-1 leading-none"
                    >
                      <span>{ded.customs_declaration.declaration_number}</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                );
              }
              return <span className="text-slate-400 font-mono text-xs flex items-center h-full">Direct Entry</span>;
            },
          },
          {
            headerName: "Office",
            width: 95,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded?.customs_declaration) return <span className="text-slate-400 text-xs">—</span>;
              return <span className="text-xs font-semibold text-slate-700">{ded.customs_declaration.customs_office_code}</span>;
            },
          },
        ],
      },
      {
        headerName: "Approved QIP Quota Item",
        headerClass: "ag-group-service",
        children: [
          {
            headerName: "Item Description",
            minWidth: 200,
            flex: 1.3,
            valueGetter: (params) => params.data?.cdc_master_item?.description_english || "",
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded) return null;
              return (
                <span className="font-semibold text-slate-900 text-xs truncate">
                  {ded.cdc_master_item?.description_english || "CDC Quota Item"}
                </span>
              );
            },
          },
          {
            headerName: "HS Code",
            width: 110,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded?.cdc_master_item?.hs_code) return <span className="text-slate-400 text-xs">—</span>;
              return <span className="font-mono text-xs text-slate-600">{ded.cdc_master_item.hs_code}</span>;
            },
          },
        ],
      },
      {
        headerName: "Quota Balances",
        headerClass: "ag-group-financial",
        children: [
          {
            headerName: "Deducted Qty",
            width: 130,
            type: "rightAligned",
            valueGetter: (params) => params.data?.deducted_quantity,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded) return null;
              return (
                <div className="flex items-center justify-end h-full">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    -{parseFloat(String(ded.deducted_quantity)).toLocaleString()}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">
                      {ded.cdc_master_item?.unit_of_measure}
                    </span>
                  </span>
                </div>
              );
            },
          },
          {
            headerName: "Balance Before",
            width: 125,
            type: "rightAligned",
            valueGetter: (params) => params.data?.balance_before,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded) return null;
              return (
                <div className="flex items-center justify-end h-full font-mono text-xs text-slate-500">
                  {parseFloat(String(ded.balance_before)).toLocaleString()}
                </div>
              );
            },
          },
          {
            headerName: "Balance After",
            width: 125,
            type: "rightAligned",
            valueGetter: (params) => params.data?.balance_after,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded) return null;
              return (
                <div className="flex items-center justify-end h-full font-mono font-bold text-xs text-emerald-700">
                  {parseFloat(String(ded.balance_after)).toLocaleString()}
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Audit & Operator",
        headerClass: "ag-group-schedule",
        children: [
          {
            headerName: "Deducted Date",
            field: "deducted_at",
            width: 135,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded?.deducted_at) return null;
              return (
                <span className="text-xs font-mono text-slate-600">
                  {new Date(ded.deducted_at).toLocaleDateString("en-GB")}
                </span>
              );
            },
          },
          {
            headerName: "Operator",
            width: 125,
            cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
              const ded = params.data;
              if (!ded) return null;
              return (
                <div className="flex items-center gap-1 text-xs text-slate-600 truncate">
                  <User className="size-3 text-slate-400 shrink-0" />
                  <span className="truncate">{ded.created_by_user?.name || "System"}</span>
                </div>
              );
            },
          },
        ],
      },
    ];

    if (activeView === "balances") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Deduction Ref", "Customs SAD Declaration", "Quota Balances"].includes(name || "");
      });
    }
    if (activeView === "audit") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Deduction Ref", "Approved QIP Quota Item", "Audit & Operator"].includes(name || "");
      });
    }
    return allCols;
  }, [activeView]);

  if (!organization) return <NoOrganization />;
  if (deductionsRes.error) return <ErrorBox message={deductionsRes.error} />;
  if (!deductionsRes.data) return <Loading />;

  return (
    <div className="flex flex-col h-full w-full">
      <WorkspaceHeaderSlot
        fullWidth={true}
        title="CDC Quota Deductions"
        icon={MinusCircle}
        tabs={[
          { id: "all", label: "All Deductions", count: rawDeductions.length },
        ]}
        activeTab="all"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search deduction ref, declaration SAD, HS code or item..."
        subHeader={
          <>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <FloatingDateFilter
                label="Deducted"
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
                  { id: "default", label: "Default View", desc: "All columns & quota balances" },
                  { id: "balances", label: "Quota Balances", desc: "Deduction qty & before/after" },
                  { id: "audit", label: "Audit & Operator", desc: "Item & timestamp audit" },
                ]}
                onSelectView={setActiveView}
              />
              <ViewSettingsButton onClick={resetAllFilters} />
            </div>
          </>
        }
      />

      {/* KPI Overview Summary Row */}
      <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0 bg-slate-50/50 border-b border-slate-200/60">
        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Cut-Stock Deductions</span>
            <MinusCircle size={13} className="text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{rawDeductions.length}</div>
          <div className="text-[10px] text-slate-400">Recorded across declarations</div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Active CDC Master Lists</span>
            <ListChecks size={13} className="text-blue-900" />
          </div>
          <div className="text-lg font-bold text-blue-900 mt-0.5">
            {catalog?.stats?.total_cdc_lists || 0}
          </div>
          <div className="text-[10px] text-slate-400">
            <Link href="/customs/cdc" className="text-blue-900 hover:underline">
              Manage QIP quotas &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Duty Exemption</span>
            <TrendingDown size={13} className="text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">
            ${(catalog?.stats?.total_cdc_exemption_usd || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-slate-400">Exempted under Article 14 Law on Investment</div>
        </div>
      </div>

      {deductions.length === 0 ? (
        <div className="p-8">
          <Empty
            title="No quota deductions found"
            description="No quota cut-stock deductions have been recorded yet. Deductions are automatically generated when customs declarations are cleared."
          />
        </div>
      ) : (
        <MekongDataGrid<CdcQuotaDeduction>
          rowData={deductions}
          columnDefs={columnDefs}
          title="CDC Cut-Stock Ledger"
          quickFilterPlaceholder="Quick search deduction ref, HS code, SAD #..."
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
