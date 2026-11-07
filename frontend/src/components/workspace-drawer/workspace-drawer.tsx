"use client";

import React, { useState, ReactNode } from "react";
import {
  Maximize2,
  Minimize2,
  X,
  Plus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 1. Types
// ---------------------------------------------------------------------------

export type WorkspaceTab = {
  id: string;
  label: string;
  subtitle?: string;
  active: boolean;
  indicatorColor?: string;
};

export interface WorkspaceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: "4/5" | "3/4" | "full" | "3xl" | "2xl" | "xl" | "lg" | "default";
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showFullscreenToggle?: boolean;
  headerTabs?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 2. Main WorkspaceDrawer Component
// ---------------------------------------------------------------------------

export function WorkspaceDrawer({
  open,
  onOpenChange,
  title,
  description = "Operational workspace drawer",
  size = "4/5",
  isFullscreen: controlledFullscreen,
  onToggleFullscreen,
  showFullscreenToggle = true,
  headerTabs,
  headerActions,
  children,
  className,
  ariaLabel,
}: WorkspaceDrawerProps) {
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = controlledFullscreen !== undefined ? controlledFullscreen : internalFullscreen;

  const handleToggle = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen(!internalFullscreen);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size={isFullscreen ? "full" : size}
        className={cn(
          "flex flex-col gap-0 border-l border-slate-200 p-0 overflow-hidden shadow-2xl transition-all duration-300 bg-[#F5F6F8]",
          className
        )}
        showCloseButton={false}
        aria-label={ariaLabel || title}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>

        {/* Top Header: Drafts Tab Bar & Action Controls */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 select-none">
          {/* Left Tabs Area */}
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto custom-scrollbar pr-3">
            {headerTabs}
          </div>

          {/* Right Action Controls */}
          <div className="flex shrink-0 items-center gap-1.5 pl-2">
            {showFullscreenToggle && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleToggle}
                className="h-8 gap-1.5 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                title={isFullscreen ? `Switch to ${size} drawer` : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">
                  {isFullscreen ? `Standard ${size}` : "Fullscreen"}
                </span>
              </Button>
            )}

            {headerActions}

            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 p-0 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close"
            >
              <X size={15} />
            </Button>
          </div>
        </div>

        {/* Workspace Body */}
        {children}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// 3. Draft Tabs Component
// ---------------------------------------------------------------------------

export function WorkspaceDraftTabs({
  tabs,
  onSelectTab,
  onCloseTab,
  onAddTab,
  addTabTooltip = "Add another draft",
}: {
  tabs: WorkspaceTab[];
  onSelectTab: (id: string) => void;
  onCloseTab?: (id: string, e: React.MouseEvent) => void;
  onAddTab?: () => void;
  addTabTooltip?: string;
}) {
  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.active;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group relative flex h-10 min-w-44 max-w-64 cursor-pointer items-center rounded-t-lg border border-b-0 px-2.5 transition-all ${
              isActive
                ? "border-slate-200 border-t-2 border-t-blue-600 bg-white font-semibold text-blue-950 shadow-2xs"
                : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-xs mr-2",
                tab.indicatorColor || (isActive ? "bg-blue-600" : "bg-slate-300 group-hover:bg-slate-400")
              )}
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold leading-tight">{tab.label}</span>
              {tab.subtitle && (
                <span className="block truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {tab.subtitle}
                </span>
              )}
            </div>
            {onCloseTab && tabs.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id, e);
                }}
                aria-label={`Close ${tab.label}`}
                className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {onAddTab && (
        <button
          type="button"
          onClick={onAddTab}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition-colors"
          title={addTabTooltip}
        >
          <Plus size={14} />
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. Workspace Split / Single Body Layout
// ---------------------------------------------------------------------------

export function WorkspaceBody({
  variant = "split",
  leftRatio = "minmax(0,62%)",
  rightRatio = "minmax(0,38%)",
  children,
  className,
}: {
  variant?: "split" | "single";
  leftRatio?: string;
  rightRatio?: string;
  children: ReactNode;
  className?: string;
}) {
  if (variant === "single") {
    return (
      <div className={cn("min-h-0 flex-1 overflow-y-auto custom-scrollbar bg-[#F5F6F8] p-4 sm:p-5", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-cols-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden",
        className
      )}
      style={{
        gridTemplateColumns: `var(--grid-split, ${leftRatio} ${rightRatio})`,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Vektor-Style Workspace Card
// ---------------------------------------------------------------------------

export function WorkspaceCard({
  icon: Icon,
  iconBg = "bg-blue-50 text-blue-600",
  title,
  subtitle,
  badge,
  action,
  children,
  className,
}: {
  icon?: React.ElementType | ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    const Component = Icon as React.ElementType;
    return <Component size={14} />;
  };

  return (
    <div className={cn("rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-3.5", className)}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn("flex size-6 items-center justify-center rounded-md shrink-0", iconBg)}>
              {renderIcon()}
            </div>
          )}
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {badge}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
