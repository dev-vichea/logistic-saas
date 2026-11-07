"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedToggleOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export interface FormCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerRight?: React.ReactNode;
  toggleOptions?: SegmentedToggleOption[];
  toggleValue?: string;
  onToggleChange?: (value: string) => void;
  padding?: "p-4" | "p-5";
  contentClassName?: string;
}

export function FormCard({
  icon,
  title,
  description,
  headerRight,
  toggleOptions,
  toggleValue,
  onToggleChange,
  padding = "p-5",
  className,
  contentClassName,
  children,
  ...props
}: FormCardProps) {
  const hasHeader = Boolean(title || icon || headerRight || toggleOptions);

  return (
    <div
      className={cn(
        "rounded-xl border border-[#eaecf0] dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-xs transition-colors",
        padding,
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#eaecf0] dark:border-slate-800/80 mb-4">
          {/* Left: Icon Badge + Section Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="size-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-semibold text-[#020d2d] dark:text-slate-100 truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-[#505966] dark:text-slate-400 truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Segmented Toggle Pill or Custom Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {toggleOptions && toggleOptions.length > 0 && (
              <div
                role="radiogroup"
                aria-label={typeof title === "string" ? `${title} mode` : "Toggle options"}
                className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-slate-800/80 p-0.5 text-xs font-medium select-none"
              >
                {toggleOptions.map((opt) => {
                  const isActive = opt.value === toggleValue;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => onToggleChange?.(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                          : "text-[#505966] dark:text-slate-400 hover:text-[#020d2d] dark:hover:text-slate-200",
                      )}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {headerRight}
          </div>
        </div>
      )}

      {/* Interior Layout */}
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </div>
  );
}
