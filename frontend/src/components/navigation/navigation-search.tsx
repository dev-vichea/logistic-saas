"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, CornerDownLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  dashboardNav,
  myTasksNav,
  commercialItems,
  operationsGroups,
  businessGroups,
  systemGroups,
  procurementItems,
  type NavigationItem,
} from "@/lib/navigation";

type SearchEntry = NavigationItem & { group: string };

export function NavigationSearch({
  open,
  onOpenChange,
  can,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  can: (permission: string) => boolean;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  const entries: SearchEntry[] = [
    { ...dashboardNav, group: "Workspace" },
    { ...myTasksNav, group: "Workspace" },
    ...commercialItems
      .filter((item) => !item.permission || can(item.permission))
      .map((item) => ({ ...item, group: "Commercial" })),
    ...operationsGroups.flatMap((group) =>
      group.items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({ ...item, group: `Operations · ${group.label}` })),
    ),
    ...businessGroups.flatMap((group) =>
      group.items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({ ...item, group: `Business · ${group.label}` })),
    ),
    ...systemGroups.flatMap((group) =>
      group.items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({ ...item, group: `System · ${group.label}` })),
    ),
    ...procurementItems
      .filter((item) => !item.permission || can(item.permission))
      .map((item) => ({ ...item, group: "Procurement (Optional)" })),
  ];

  const matches = entries.filter((item) =>
    `${item.label} ${item.group} ${item.description}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const available = matches.filter((item) => item.href);
  const active = available[selected] || available[0];

  useEffect(() => {
    if (active)
      list.current
        ?.querySelector(`[data-result="${active.id}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function navigate(item: SearchEntry) {
    if (!item.href) return;
    onOpenChange(false);
    onNavigate();
    router.push(item.href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-[570px]"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          const target = document.getElementById(
            window.matchMedia("(min-width: 1024px)").matches
              ? "sidebar-search"
              : "workspace-menu-toggle",
          );
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogTitle className="sr-only">Search navigation</DialogTitle>
        <DialogDescription className="sr-only">
          Find a ShipFlow logistics module, tool or setting.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3.5 bg-slate-50/50">
          <Search size={18} className="shrink-0 text-blue-900" />
          <input
            autoFocus
            role="combobox"
            aria-label="Find a page"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="navigation-results"
            aria-activedescendant={
              active ? `navigation-result-${active.id}` : undefined
            }
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 font-sans"
            placeholder="Search ShipFlow navigation (e.g. shipments, dispatch, bills, customs)..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((index) =>
                  available.length
                    ? (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        available.length) %
                      available.length
                    : 0,
                );
              }
              if (event.key === "Enter" && active) {
                event.preventDefault();
                navigate(active);
              }
            }}
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 shadow-2xs"
            aria-label="Close navigation search"
          >
            Esc
          </button>
        </div>
        <div
          ref={list}
          id="navigation-results"
          role="listbox"
          aria-label="Pages"
          className="max-h-[min(58dvh,450px)] overflow-y-auto p-2"
        >
          {!matches.length && (
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              No matching modules found. Try &ldquo;shipments&rdquo;, &ldquo;dispatch&rdquo; or &ldquo;customs&rdquo;.
            </p>
          )}
          {matches.map((item) => (
            <button
              key={`${item.group}-${item.id}`}
              id={`navigation-result-${item.id}`}
              data-result={item.id}
              type="button"
              role="option"
              disabled={!item.href}
              aria-selected={active?.id === item.id}
              onMouseMove={() => {
                const index = available.findIndex(
                  (entry) => entry.id === item.id,
                );
                if (index >= 0) setSelected(index);
              }}
              onClick={() => navigate(item)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                active?.id === item.id
                  ? "bg-blue-50 text-blue-950 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              } disabled:opacity-45`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                  active?.id === item.id
                    ? "border-blue-200 bg-white text-blue-900"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <item.icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block text-xs font-semibold text-slate-900">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-blue-800">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {item.group} · {item.description}
                </span>
              </span>
              {item.href ? (
                <ArrowUpRight size={14} className="shrink-0 text-slate-400" />
              ) : (
                <span className="sidebar-planned">Planned</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[10px] text-slate-500">
          <span>ShipFlow Transportation & Logistics SaaS</span>
          <span className="flex items-center gap-2 font-mono">
            <span>↑ ↓ navigate</span>
            <CornerDownLeft size={11} />
            <span>select</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
