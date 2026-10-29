"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ChevronDown, Calendar, ArrowUpDown, Settings2 } from "lucide-react";
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
