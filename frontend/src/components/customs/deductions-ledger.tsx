"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type ColDef } from "ag-grid-community";
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
  DateRangePill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function DeductionsLedger() {
  const { organization } = useWorkspace();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");

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

  const deductions = deductionsRes.data?.data || [];

  const columnDefs = useMemo<ColDef<CdcQuotaDeduction>[]>(
    () => [
      {
        headerName: "DEDUCTION REF",
        field: "deduction_reference",
        minWidth: 170,
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
        headerName: "CUSTOMS SAD DECLARATION",
        minWidth: 200,
        flex: 1,
        valueGetter: (params) => params.data?.customs_declaration?.declaration_number || "",
        cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
          const ded = params.data;
          if (!ded) return null;
          if (ded.customs_declaration) {
            return (
              <div className="flex flex-col justify-center h-full py-1 leading-tight">
                <Link
                  href={`/customs/${ded.customs_declaration.id}`}
                  className="font-mono font-bold text-blue-900 hover:text-blue-700 text-xs flex items-center gap-1"
                >
                  <span>{ded.customs_declaration.declaration_number}</span>
                  <ArrowRight size={11} />
                </Link>
                <span className="text-[10px] text-slate-400 uppercase mt-0.5">
                  {ded.customs_declaration.customs_office_code} • {ded.customs_declaration.status}
                </span>
              </div>
            );
          }
          return <span className="text-slate-400 font-mono text-xs flex items-center h-full">Manual / Direct</span>;
        },
      },
      {
        headerName: "APPROVED QIP ITEM",
        minWidth: 240,
        flex: 1.5,
        valueGetter: (params) =>
          `${params.data?.cdc_master_item?.description_english || ""} ${params.data?.cdc_master_item?.hs_code || ""}`,
        cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
          const ded = params.data;
          if (!ded) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1 leading-tight">
              <div className="font-semibold text-slate-900 truncate">
                {ded.cdc_master_item?.description_english || "CDC Quota Item"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                HS: {ded.cdc_master_item?.hs_code || "N/A"} • Item #{ded.cdc_master_item?.item_number}
              </div>
            </div>
          );
        },
      },
      {
        headerName: "DEDUCTED QTY",
        minWidth: 130,
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
        headerName: "BALANCE BEFORE",
        width: 130,
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
        headerName: "BALANCE AFTER",
        width: 130,
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
      {
        headerName: "DEDUCTED AT",
        field: "deducted_at",
        width: 150,
        cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
          const ded = params.data;
          if (!ded) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1 leading-tight text-xs text-slate-700">
              <span className="font-medium">{new Date(ded.deducted_at).toLocaleDateString()}</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {new Date(ded.deducted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "OPERATOR",
        width: 130,
        cellRenderer: (params: CustomCellRendererProps<CdcQuotaDeduction>) => {
          const ded = params.data;
          if (!ded) return null;
          return (
            <div className="flex items-center gap-1.5 h-full text-xs text-slate-600">
              <User className="size-3 text-slate-400 shrink-0" />
              <span className="truncate">{ded.created_by_user?.name || "System"}</span>
            </div>
          );
        },
      },
    ],
    []
  );

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
          { id: "all", label: "All Deductions", count: deductions.length },
        ]}
        activeTab="all"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search deduction ref, declaration SAD, HS code or item..."
        subHeader={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePill />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "latest", label: "Latest deduction" },
                  { value: "ref", label: "Deduction reference" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
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
          <div className="text-lg font-bold text-slate-900 mt-0.5">{deductions.length}</div>
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
