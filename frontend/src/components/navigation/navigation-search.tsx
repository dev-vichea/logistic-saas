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
  navigationGroups,
  overview,
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
    { ...overview, group: "Workspace" },
    ...navigationGroups.flatMap((group) =>
      group.items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({ ...item, group: group.label })),
    ),
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
          Find a workspace page. Planned modules are visible but unavailable in
          v0.2.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Search size={19} className="shrink-0 text-primary" />
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
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Where would you like to go?"
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
            className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
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
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No pages found. Try “partners”, “team” or “documents”.
            </p>
          )}
          {matches.map((item) => (
            <button
              key={item.id}
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
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${active?.id === item.id ? "bg-emerald-50 text-primary" : "text-foreground"} disabled:opacity-50`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white">
                <item.icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">{item.label}</span>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  {item.group} · {item.description}
                </span>
              </span>
              {item.href ? (
                <ArrowUpRight size={14} className="shrink-0" />
              ) : (
                <span className="sidebar-planned">Planned</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3 text-[10px] text-muted-foreground">
          <span>Planned modules are part of the platform roadmap.</span>
          <span className="flex items-center gap-2">
            <span>↑ ↓ to move</span>
            <CornerDownLeft size={12} />
            <span>to open</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
