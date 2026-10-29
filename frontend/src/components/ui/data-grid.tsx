"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type ColGroupDef,
  type GridReadyEvent,
  type GridApi,
  type SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import {
  Search,
  Download,
  Columns3,
  RotateCcw,
  ChevronDown,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Register all community features for AG Grid v36+
ModuleRegistry.registerModules([AllCommunityModule]);

// Mekong Enterprise Theme based on themeQuartz (Vektor-grade edge-to-edge styling)
export const mekongGridTheme = themeQuartz.withParams({
  accentColor: "#0f3e78",
  backgroundColor: "#ffffff",
  foregroundColor: "#0f172a",
  headerBackgroundColor: "#f8fafc",
  headerTextColor: "#334155",
  headerFontWeight: 600,
  headerFontSize: 11,
  borderColor: "#e2e8f0",
  rowHoverColor: "#f8fafc",
  selectedRowBackgroundColor: "#eff6ff",
  fontSize: 12,
  spacing: 5,
  borderRadius: 8,
  wrapperBorderRadius: 0,
  wrapperBorder: false,
  columnBorder: false,
  headerColumnBorder: false,
  headerRowBorder: false,
  rowBorder: "solid 1px #f1f5f9",
  pinnedColumnBorder: false,
});

export interface MekongDataGridProps<TData = Record<string, unknown>> {
  rowData: TData[];
  columnDefs: (ColDef<TData> | ColGroupDef<TData>)[];
  height?: number | string;
  className?: string;
  title?: string;
  quickFilterPlaceholder?: string;
  enableSelection?: boolean;
  enableExport?: boolean;
  enableColumnPicker?: boolean;
  enableDensityToggle?: boolean;
  enableFloatingFilter?: boolean;
  fullScreen?: boolean;
  showRowNumbers?: boolean;
  batchActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode;
  onSelectionChange?: (selectedRows: TData[]) => void;
  onGridReady?: (params: GridReadyEvent<TData>) => void;
  gridOptions?: AgGridReactProps<TData>;
}

export function MekongDataGrid<TData = Record<string, unknown>>({
  rowData,
  columnDefs,
  height,
  className = "",
  title,
  quickFilterPlaceholder = "Quick filter in table...",
  enableSelection = true,
  enableExport = true,
  enableColumnPicker = true,
  enableDensityToggle = true,
  enableFloatingFilter = false,
  fullScreen = true,
  showRowNumbers = true,
  batchActions,
  onSelectionChange,
  onGridReady,
  gridOptions,
}: MekongDataGridProps<TData>) {
  const [gridApi, setGridApi] = useState<GridApi<TData> | null>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState<TData[]>([]);
  const [density, setDensity] = useState<"compact" | "normal">("compact");
  const [columnsList, setColumnsList] = useState<{ colId: string; headerName: string; visible: boolean }[]>([]);

  // Automatically prepend Row Number '#' column if requested
  const processedColumnDefs = useMemo<(ColDef<TData> | ColGroupDef<TData>)[]>(() => {
    if (!showRowNumbers) return columnDefs;
    const hasRowNumber = columnDefs.some((c) => "colId" in c && c.colId === "_rowNumber");
    if (hasRowNumber) return columnDefs;

    const rowNumberCol: ColDef<TData> = {
      headerName: "#",
      colId: "_rowNumber",
      width: 48,
      minWidth: 48,
      maxWidth: 52,
      pinned: "left",
      valueGetter: (params) =>
        params.node?.rowIndex != null ? params.node.rowIndex + 1 : "",
      cellClass: "font-mono text-[11px] text-slate-400 text-center flex items-center justify-center select-none",
      headerClass: "text-center",
      sortable: false,
      filter: false,
      floatingFilter: false,
      resizable: false,
      suppressHeaderMenuButton: true,
      suppressMovable: true,
    };

    return [rowNumberCol, ...columnDefs];
  }, [columnDefs, showRowNumbers]);

  const handleGridReady = useCallback(
    (params: GridReadyEvent<TData>) => {
      setGridApi(params.api);

      // Extract columns for visibility menu
      const allCols = params.api.getColumns();
      if (allCols) {
        setColumnsList(
          allCols
            .filter((c) => c.getColId() !== "selection" && c.getColId() !== "_rowNumber")
            .map((c) => ({
              colId: c.getColId(),
              headerName: c.getColDef().headerName || c.getColId(),
              visible: c.isVisible(),
            }))
        );
      }

      if (onGridReady) {
        onGridReady(params);
      }
    },
    [onGridReady]
  );

  const handleQuickFilterChange = (val: string) => {
    setQuickFilter(val);
    gridApi?.setGridOption("quickFilterText", val);
  };

  const handleSelectionChanged = (event: SelectionChangedEvent<TData>) => {
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected);
    if (onSelectionChange) {
      onSelectionChange(selected);
    }
  };

  const toggleColumn = (colId: string) => {
    if (!gridApi) return;
    const col = gridApi.getColumn(colId);
    if (!col) return;
    const nextVis = !col.isVisible();
    gridApi.setColumnsVisible([colId], nextVis);
    setColumnsList((prev) =>
      prev.map((c) => (c.colId === colId ? { ...c, visible: nextVis } : c))
    );
  };

  const resetColumns = () => {
    if (!gridApi) return;
    gridApi.resetColumnState();
    const allCols = gridApi.getColumns();
    if (allCols) {
      setColumnsList(
        allCols
          .filter((c) => c.getColId() !== "selection" && c.getColId() !== "_rowNumber")
          .map((c) => ({
            colId: c.getColId(),
            headerName: c.getColDef().headerName || c.getColId(),
            visible: c.isVisible(),
          }))
      );
    }
    gridApi.sizeColumnsToFit();
  };

  const handleExportCsv = () => {
    if (!gridApi) return;
    gridApi.exportDataAsCsv({
      fileName: `export-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  };

  const clearSelection = () => {
    gridApi?.deselectAll();
  };

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      floatingFilter: enableFloatingFilter,
      resizable: true,
      suppressMovable: false,
      minWidth: 90,
      cellClass: "flex items-center",
      ...gridOptions?.defaultColDef,
    }),
    [enableFloatingFilter, gridOptions?.defaultColDef]
  );

  // Single-line compact row height and group header heights
  const rowHeight = density === "compact" ? 38 : 44;
  const headerHeight = 32;
  const groupHeaderHeight = 28;
  const floatingFiltersHeight = enableFloatingFilter ? 32 : undefined;

  const containerClass = fullScreen
    ? `flex-1 min-h-0 w-full h-full flex flex-col bg-white rounded-none border-0 shadow-none overflow-hidden ${className}`
    : `flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden ${className}`;

  return (
    <div className={containerClass}>
      {/* Vektor-Grade Controls Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/80 bg-slate-50/70 px-3.5 py-1.5 shrink-0">
        {/* Left: Quick Search Filter & Title / Stats */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          {title && (
            <span className="font-semibold text-xs text-slate-800 tracking-tight shrink-0 mr-1">
              {title}
            </span>
          )}

          <div className="relative w-full max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={quickFilterPlaceholder}
              value={quickFilter}
              onChange={(e) => handleQuickFilterChange(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200/90 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            {quickFilter && (
              <button
                type="button"
                onClick={() => handleQuickFilterChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span className="font-semibold text-slate-700">{rowData.length}</span>
            <span className="text-slate-400">{rowData.length === 1 ? "record" : "records"}</span>
          </div>
        </div>

        {/* Right: AG Grid Options (Columns Toggle, Density, CSV Export) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Column Visibility Picker */}
          {enableColumnPicker && columnsList.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 focus:outline-none"
                  title="Toggle columns"
                >
                  <Columns3 size={13} className="text-slate-500" />
                  <span className="hidden md:inline">Columns</span>
                  <ChevronDown size={11} className="text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto p-1">
                <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
                  TOGGLE COLUMNS
                </DropdownMenuLabel>
                {columnsList.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.colId}
                    checked={col.visible}
                    onCheckedChange={() => toggleColumn(col.colId)}
                    className="text-xs"
                  >
                    <span className="truncate">{col.headerName}</span>
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetColumns} className="text-xs text-blue-700 font-medium">
                  <RotateCcw size={12} className="mr-1.5" />
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Density Toggle */}
          {enableDensityToggle && (
            <button
              type="button"
              onClick={() => setDensity(density === "compact" ? "normal" : "compact")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all ${
                density === "compact"
                  ? "border-blue-200 bg-blue-50/70 text-blue-900"
                  : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title={`Switch to ${density === "compact" ? "Comfortable" : "Compact"} row density`}
            >
              <Layers size={13} />
              <span className="capitalize">{density}</span>
            </button>
          )}

          {/* Export to CSV */}
          {enableExport && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
              title="Export grid data to CSV file"
            >
              <Download size={13} className="text-slate-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Batch Action Toolbar (When rows are selected) */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-blue-200 bg-blue-50/90 px-4 py-2 text-xs text-blue-900 animate-in fade-in duration-200 shrink-0">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white font-mono text-[10px]">
              {selectedRows.length} {selectedRows.length === 1 ? "row selected" : "rows selected"}
            </Badge>
            <button
              type="button"
              onClick={clearSelection}
              className="text-[11px] font-medium text-blue-700 hover:underline"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            {batchActions ? (
              batchActions(selectedRows, clearSelection)
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                className="h-6 text-[11px] gap-1 bg-white text-blue-900 border-blue-300 hover:bg-blue-100"
              >
                <Download size={11} />
                Export Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* AG Grid Canvas - Stretches 100% of remaining viewport */}
      <div
        className={`${fullScreen ? "flex-1 min-h-0 w-full" : "w-full"} ag-theme-quartz`}
        style={{ height: fullScreen ? "100%" : (height || 560), width: "100%" }}
      >
        <AgGridReact<TData>
          theme={mekongGridTheme}
          rowData={rowData}
          columnDefs={processedColumnDefs}
          defaultColDef={defaultColDef}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          groupHeaderHeight={groupHeaderHeight}
          floatingFiltersHeight={floatingFiltersHeight}
          selectionColumnDef={{
            pinned: "left",
            lockPosition: "left",
            width: 44,
            minWidth: 44,
            maxWidth: 48,
            resizable: false,
            suppressHeaderMenuButton: true,
            sortable: false,
            suppressMovable: true,
          }}
          rowSelection={
            enableSelection
              ? {
                  mode: "multiRow",
                  selectAll: "all",
                  headerCheckbox: true,
                  checkboxes: true,
                }
              : undefined
          }
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          onGridReady={handleGridReady}
          onSelectionChanged={handleSelectionChanged}
          {...gridOptions}
        />
      </div>
    </div>
  );
}
