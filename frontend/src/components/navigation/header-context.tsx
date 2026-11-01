"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ChevronDown, Calendar, ArrowUpDown, Settings2, Columns3, Check, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type HeaderTab = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  count?: number;
};

export type SegmentPill = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
};

export type HeaderConfig = {
  title?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  segmentPills?: SegmentPill[];
  activeSegment?: string;
  onSegmentChange?: (id: string) => void;
  tabs?: HeaderTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  primaryAction?: React.ReactNode;
  subHeader?: React.ReactNode;
  fullWidth?: boolean;
  hideFooter?: boolean;
};

type HeaderContextType = {
  config: HeaderConfig | null;
  setConfig: (config: HeaderConfig | null) => void;
};

const HeaderContext = createContext<HeaderContextType | null>(null);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig | null>(null);

  return (
    <HeaderContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContext() {
  const ctx = useContext(HeaderContext);
  if (!ctx) {
    throw new Error("useHeaderContext must be used within a HeaderProvider");
  }
  return ctx;
}

/**
 * Hook to inject dynamic header controls (tabs, subheaders, filter toolbars)
 */
export function useHeader(config: HeaderConfig | null, deps: React.DependencyList = []) {
  const { setConfig } = useHeaderContext();

  useEffect(() => {
    setConfig(config);
    return () => {
      setConfig(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Declarative component to configure the flexible header & subheader
 */
export function WorkspaceHeaderSlot(props: HeaderConfig) {
  const { setConfig } = useHeaderContext();

  useEffect(() => {
    setConfig(props);
    return () => {
      setConfig(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.title,
    props.badge,
    props.activeSegment,
    props.activeTab,
    props.searchValue,
    props.searchPlaceholder,
    props.primaryAction,
    props.subHeader,
    props.tabs,
    props.segmentPills,
    props.fullWidth,
    props.hideFooter,
    setConfig,
  ]);

  return null;
}

/* =========================================================================
   Vektor TMS Sub-Header Primitives (Filter Pills, Dates, Sorting, View Gear)
   ========================================================================= */

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPillProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  allLabel?: string;
}

export function FilterPill({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  allLabel = "All",
}: FilterPillProps) {
  const currentOption = options.find((o) => o.value === value);
  const displayLabel = currentOption ? currentOption.label : allLabel;
  const isSelected = Boolean(value && value !== "all");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`group flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-all outline-none focus:ring-1 focus:ring-blue-600 ${
            isSelected
              ? "border-blue-300 bg-blue-50/70 text-blue-900 font-semibold"
              : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {Icon && (
            <Icon
              size={13}
              className={isSelected ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600"}
            />
          )}
          <span className="text-[10px] uppercase font-mono font-medium text-slate-400">
            {label}:
          </span>
          <span className="truncate max-w-[130px]">{displayLabel}</span>
          <ChevronDown
            size={12}
            className={`transition-transform opacity-60 group-data-[state=open]:rotate-180 ${
              isSelected ? "text-blue-700" : "text-slate-400"
            }`}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44 p-1">
        <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
          Filter by {label}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value || "all"} onValueChange={onChange}>
          <DropdownMenuRadioItem value="all" className="text-xs">
            {allLabel}
          </DropdownMenuRadioItem>
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
              <span className="flex-1 truncate">{opt.label}</span>
              {opt.count !== undefined && (
                <span className="ml-2 font-mono text-[10px] text-slate-400">
                  {opt.count}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DateRangePill({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 outline-none focus:ring-1 focus:ring-blue-600"
        >
          <Calendar size={13} className="text-slate-400" />
          <span>{value || "Choose Date"}</span>
          <ChevronDown size={12} className="opacity-60 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-1 min-w-36">
        <DropdownMenuItem onClick={() => onChange?.("all")} className="text-xs">
          All Time
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange?.("today")} className="text-xs">
          Today
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange?.("this_week")} className="text-xs">
          This Week
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange?.("this_month")} className="text-xs">
          This Month
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SortPill({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  const current = options.find((o) => o.value === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 outline-none focus:ring-1 focus:ring-blue-600"
        >
          <ArrowUpDown size={12} className="text-slate-400" />
          <span className="truncate">{current?.label || "Sort"}</span>
          <ChevronDown size={12} className="opacity-60 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 p-1">
        <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
          Sort Order
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewSettingsButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="View Settings & Columns"
      aria-label="View Settings & Columns"
      className="flex size-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
    >
      <Settings2 size={14} />
    </button>
  );
}

export function FilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs transition-all outline-none focus:ring-1 focus:ring-blue-600 ${
        checked
          ? "border-blue-300 bg-blue-50/70 text-blue-900 font-semibold shadow-2xs"
          : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`size-2 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      />
      <span>{label}</span>
    </button>
  );
}

/* =========================================================================
   Vektor TMS Floating-Label Box Filters (Template Matching)
   ========================================================================= */

interface FloatingFilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  allLabel?: string;
  minWidth?: string;
}

export function FloatingFilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
  minWidth = "min-w-[125px]",
}: FloatingFilterSelectProps) {
  const currentOption = options.find((o) => o.value === value);
  const displayLabel = currentOption ? currentOption.label : allLabel;
  const isSelected = Boolean(value && value !== "all");

  return (
    <div className={`relative ${minWidth}`}>
      <span
        className={`absolute -top-1.5 left-2 z-10 bg-white px-1 font-mono text-[9px] font-semibold tracking-wider uppercase transition-colors pointer-events-none select-none ${
          isSelected ? "text-blue-700" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`group flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 text-xs transition-all outline-none focus:ring-1 focus:ring-blue-600 ${
              isSelected
                ? "border-blue-400 bg-blue-50/40 text-blue-900 font-medium shadow-2xs"
                : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span className="truncate pr-1 text-left">{displayLabel}</span>
            <ChevronDown
              size={12}
              className={`shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180 ${
                isSelected ? "text-blue-700 opacity-90" : "text-slate-400"
              }`}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44 max-h-64 overflow-y-auto p-1">
          <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
            FILTER BY {label.toUpperCase()}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value || "all"} onValueChange={onChange}>
            <DropdownMenuRadioItem value="all" className="text-xs">
              {allLabel}
            </DropdownMenuRadioItem>
            {options.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="ml-2 font-mono text-[10px] text-slate-400">
                    {opt.count}
                  </span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FloatingDateFilter({
  label = "Readiness",
  value,
  onChange,
  options: customOptions,
}: {
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  options?: { value: string; label: string }[];
}) {
  const options = customOptions || [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "next_30", label: "Next 30 Days" },
  ];
  const current = options.find((o) => o.value === value) || options[0];
  const isSelected = Boolean(value && value !== "all");

  return (
    <div className="relative min-w-[130px]">
      <span
        className={`absolute -top-1.5 left-2 z-10 bg-white px-1 font-mono text-[9px] font-semibold tracking-wider uppercase transition-colors pointer-events-none select-none ${
          isSelected ? "text-blue-700" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`group flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 text-xs transition-all outline-none focus:ring-1 focus:ring-blue-600 ${
              isSelected
                ? "border-blue-400 bg-blue-50/40 text-blue-900 font-medium shadow-2xs"
                : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate pr-1">
              <Calendar size={12} className={isSelected ? "text-blue-600" : "text-slate-400"} />
              <span className="truncate">{current.label}</span>
            </div>
            <ChevronDown
              size={12}
              className={`shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180 ${
                isSelected ? "text-blue-700 opacity-90" : "text-slate-400"
              }`}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40 p-1">
          <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
            FILTER BY {label.toUpperCase()}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value || "all"} onValueChange={onChange}>
            {options.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export interface ViewPreset {
  id: string;
  label: string;
  desc?: string;
}

export function ViewPresetSelector({
  activeView,
  onSelectView,
  presets,
}: {
  activeView: string;
  onSelectView: (viewId: string) => void;
  presets?: ViewPreset[];
}) {
  const views = presets || [
    { id: "default", label: "Default View", desc: "All columns & specifications" },
    { id: "commercial", label: "Commercial Focus", desc: "Shipper, terms & quote actions" },
    { id: "routing", label: "Routing & Cargo", desc: "Origin, destination, pieces & weight" },
  ];
  const current = views.find((v) => v.id === activeView) || views[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <Columns3 size={13} className="text-slate-500" />
          <span className="hidden sm:inline font-semibold text-slate-900">{current.label}</span>
          <ChevronDown size={11} className="text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1">
        <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
          TABLE VIEW PRESETS
        </DropdownMenuLabel>
        {views.map((v) => (
          <DropdownMenuItem
            key={v.id}
            onClick={() => onSelectView(v.id)}
            className={`flex flex-col items-start gap-0.5 text-xs py-1.5 cursor-pointer ${
              activeView === v.id ? "bg-blue-50/70 font-semibold text-blue-900" : ""
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span>{v.label}</span>
              {activeView === v.id && <Check size={12} className="text-blue-700" />}
            </div>
            <span className="text-[10px] text-slate-400 font-normal">{v.desc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FilterResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-800 transition-colors"
      title="Reset all active filters"
    >
      <RotateCcw size={11} />
      <span>Reset</span>
    </button>
  );
}
