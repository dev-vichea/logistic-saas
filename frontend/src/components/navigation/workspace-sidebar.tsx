"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, Tooltip } from "radix-ui";
import {
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  Loader2,
  ArrowUpRight,
  Sparkles,
  Pin,
  Files,
  ListTodo,
} from "lucide-react";
import { Brand } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Organization, User } from "@/lib/types";
import {
  dashboardNav,
  myTasksNav,
  commercialItems,
  operationsGroups,
  businessGroups,
  systemGroups,
  procurementItems,
  itemMatchesPath,
  type NavigationGroup,
  type NavigationItem,
} from "@/lib/navigation";
import { NavigationSearch } from "./navigation-search";

const compactKey = "shipflow.sidebar.compact";
let memoryCompact = false;
let storageUnavailable = false;

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("shipflow-sidebar", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("shipflow-sidebar", listener);
  };
}

function compactSnapshot() {
  if (storageUnavailable) return memoryCompact;
  try {
    return window.localStorage.getItem(compactKey) === "true";
  } catch {
    return memoryCompact;
  }
}

export function useSidebarCompact() {
  const compact = useSyncExternalStore(subscribe, compactSnapshot, () => false);
  function toggle() {
    memoryCompact = !compact;
    try {
      window.localStorage.setItem(compactKey, String(memoryCompact));
    } catch {
      storageUnavailable = true;
    }
    window.dispatchEvent(new Event("shipflow-sidebar"));
  }
  return { compact, toggle };
}

type Props = {
  user: User;
  organization: Organization | null;
  organizations: Organization[];
  can: (permission: string) => boolean;
  switching: boolean;
  onSwitch: (id: string) => Promise<void>;
  onLogout: () => Promise<void>;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  compact: boolean;
  onToggleCompact: () => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
};

const menuClass =
  "sidebar-menu z-[70] min-w-56 max-w-80 rounded-xl border border-slate-200 bg-white p-1.5 text-foreground shadow-xl";

export function WorkspaceSidebar(props: Props) {
  const { onMobileOpenChange, onSearchOpenChange } = props;
  const path = usePathname();
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [procurementOpen, setProcurementOpen] = useState(false);

  const searchOpen =
    props.searchOpen !== undefined ? props.searchOpen : internalSearchOpen;

  const setSearchOpen = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setInternalSearchOpen((prev) => {
        const current = props.searchOpen !== undefined ? props.searchOpen : prev;
        const nextVal = typeof val === "function" ? val(current) : val;
        if (onSearchOpenChange) {
          onSearchOpenChange(nextVal);
        }
        return nextVal;
      });
    },
    [props.searchOpen, onSearchOpenChange],
  );

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key.toLowerCase() === "k" || event.key.toLowerCase() === "j")
      ) {
        event.preventDefault();
        onMobileOpenChange(false);
        setSearchOpen((open: boolean) => !open);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onMobileOpenChange, setSearchOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const change = () => {
      if (media.matches) onMobileOpenChange(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [onMobileOpenChange]);

  function openSearch() {
    onMobileOpenChange(false);
    setSearchOpen(true);
  }

  const finishNavigation = () => onMobileOpenChange(false);

  const orgInitial = props.organization?.name
    ? props.organization.name.charAt(0).toUpperCase()
    : "S";

  const userInitials = props.user.name
    ? props.user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  // Filter groups by user permissions
  const filterGroup = (group: NavigationGroup) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || props.can(item.permission),
    ),
  });

  const filteredOperations = operationsGroups
    .map(filterGroup)
    .filter((g) => g.items.length > 0);

  const filteredBusiness = businessGroups
    .map(filterGroup)
    .filter((g) => g.items.length > 0);

  const filteredSystem = systemGroups
    .map(filterGroup)
    .filter((g) => g.items.length > 0);

  const filteredCommercial = commercialItems.filter(
    (item) => !item.permission || props.can(item.permission),
  );

  const filteredProcurement = procurementItems.filter(
    (item) => !item.permission || props.can(item.permission),
  );

  function content(compact: boolean, mobile: boolean) {
    return (
      <>
        {/* Top Header Bar */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${
            compact ? "justify-center px-3" : "justify-between px-4"
          }`}
        >
          <Link
            href="/dashboard"
            aria-label="ShipFlow home"
            onClick={finishNavigation}
            className="flex items-center gap-2"
          >
            <Brand compact={compact} />
          </Link>
          {!compact &&
            (mobile ? (
              <button
                type="button"
                aria-label="Close menu"
                onClick={finishNavigation}
                className="sidebar-icon-button"
              >
                <X size={17} />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                onClick={props.onToggleCompact}
                className="sidebar-icon-button"
              >
                <PanelLeftClose size={17} />
              </button>
            ))}
        </div>

        {/* Organization Header Card / Switcher */}
        <div className={compact ? "px-3 pt-3" : "px-3 pt-3 pb-1"}>
          {compact ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Switch organization"
                  title={props.organization?.name || "Organizations"}
                  className="relative flex size-10 w-full items-center justify-center rounded-xl bg-blue-950 font-mono text-xs font-bold text-white shadow-2xs hover:bg-blue-900 transition-colors"
                >
                  {props.switching ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    orgInitial
                  )}
                  <ChevronDown
                    size={9}
                    className="absolute bottom-1 right-1 text-white/70"
                  />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="right"
                  align="start"
                  sideOffset={12}
                  className={menuClass}
                >
                  <DropdownMenu.Label className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    SWITCH ORGANIZATION
                  </DropdownMenu.Label>
                  <div className="max-h-72 overflow-y-auto">
                    <DropdownMenu.RadioGroup
                      value={String(props.organization?.id || "")}
                      onValueChange={props.onSwitch}
                    >
                      {props.organizations.map((organization) => (
                        <DropdownMenu.RadioItem
                          disabled={props.switching}
                          key={organization.id}
                          value={String(organization.id)}
                          className="sidebar-menu-item"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {organization.name}
                          </span>
                          {props.organization?.id === organization.id && (
                            <Check size={14} className="text-primary" />
                          )}
                        </DropdownMenu.RadioItem>
                      ))}
                    </DropdownMenu.RadioGroup>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <MenuLink href="/organizations" onNavigate={finishNavigation}>
                    Manage organizations
                  </MenuLink>
                  <MenuLink
                    href="/organizations/new"
                    onNavigate={finishNavigation}
                  >
                    Create organization
                  </MenuLink>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <div className="group relative rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs transition-all hover:border-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-950 font-mono text-xs font-bold text-white shadow-2xs">
                  {props.switching ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    orgInitial
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-900">
                    {props.organization?.name || "Select Workspace"}
                  </div>
                  <div className="truncate text-[10px] font-mono font-medium text-slate-400 uppercase tracking-tight">
                    {props.organization?.tax_number
                      ? `TIN: ${props.organization.tax_number}`
                      : props.organization?.registration_number
                      ? `REG: ${props.organization.registration_number}`
                      : `${props.organization?.country_code || "SEA"} · ACTIVE HUB`}
                  </div>
                </div>
                <ChevronsUpDown
                  size={14}
                  className="shrink-0 text-slate-400 transition-colors group-hover:text-slate-700"
                />
              </div>

              {/* Native Select overlaid for complete Playwright selectOption compatibility */}
              <select
                aria-label="Switch organization"
                value={props.organization?.id || ""}
                onChange={(event) => void props.onSwitch(event.target.value)}
                disabled={props.switching}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              >
                {props.organizations.length ? (
                  props.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))
                ) : (
                  <option value="">Create a workspace</option>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className={compact ? "px-3 py-3" : "px-3 pt-3 pb-2"}>
          <button
            type="button"
            id={mobile ? "mobile-sidebar-search" : "sidebar-search"}
            aria-label="Search navigation"
            onClick={openSearch}
            title="Search navigation (Ctrl/⌘ K)"
            className={`sidebar-search ${compact ? "justify-center px-0" : "px-3"}`}
          >
            <Search size={15} />
            {!compact && (
              <>
                <span className="flex-1 text-left text-slate-500 font-normal">
                  Search navigation
                </span>
                <kbd className="rounded border bg-white px-1 py-0.5 font-mono text-[9px] text-muted-foreground shadow-2xs">
                  ⌘ K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav
          aria-label="Main navigation"
          className={`sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          {/* ═════════════════════════════════════════════════════════ */}
          {/* 1. WORKSPACE                                             */}
          {/* ═════════════════════════════════════════════════════════ */}
          {!compact && (
            <p className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              WORKSPACE
            </p>
          )}

          <div className="space-y-0.5">
            <NavLink
              item={dashboardNav}
              path={path}
              compact={compact}
              onNavigate={finishNavigation}
            />

            {/* My Tasks Item */}
            {compact ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => setTasksOpen(true)}
                    className="sidebar-rail-link relative"
                    aria-label="My Tasks"
                  >
                    <myTasksNav.icon size={20} />
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-blue-600 ring-2 ring-white" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    sideOffset={12}
                    className="z-[80] rounded-lg bg-foreground px-3 py-2 text-xs text-white"
                  >
                    My Tasks (3 pending)
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              <button
                type="button"
                onClick={() => setTasksOpen(true)}
                className="sidebar-live-link group"
              >
                <myTasksNav.icon size={15} className="text-slate-500 group-hover:text-slate-800" />
                <span className="flex-1 truncate">{myTasksNav.label}</span>
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-blue-800">
                  3
                </span>
              </button>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* 2. COMMERCIAL                                            */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="my-2 border-t border-slate-100" />
          {!compact && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              COMMERCIAL
            </p>
          )}

          <div className="space-y-0.5">
            {filteredCommercial.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                path={path}
                compact={compact}
                onNavigate={finishNavigation}
              />
            ))}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* 3. OPERATIONS                                            */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="my-2 border-t border-slate-100" />
          {!compact && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              OPERATIONS
            </p>
          )}

          <div className={compact ? "space-y-1.5" : "space-y-1"}>
            {filteredOperations.map((group) =>
              compact ? (
                <RailGroup
                  key={group.id}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                />
              ) : (
                <ExpandedGroup
                  key={`${group.id}-${
                    group.items.some((item) => itemMatchesPath(item, path))
                      ? path
                      : "idle"
                  }-${mobile ? "mobile" : "desktop"}`}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                  mobile={mobile}
                />
              ),
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* 4. BUSINESS                                              */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="my-2 border-t border-slate-100" />
          {!compact && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              BUSINESS
            </p>
          )}

          <div className={compact ? "space-y-1.5" : "space-y-1"}>
            {filteredBusiness.map((group) =>
              compact ? (
                <RailGroup
                  key={group.id}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                />
              ) : (
                <ExpandedGroup
                  key={`${group.id}-${
                    group.items.some((item) => itemMatchesPath(item, path))
                      ? path
                      : "idle"
                  }-${mobile ? "mobile" : "desktop"}`}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                  mobile={mobile}
                />
              ),
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* 5. SYSTEM                                                */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="my-2 border-t border-slate-100" />
          {!compact && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              SYSTEM
            </p>
          )}

          <div className={compact ? "space-y-1.5" : "space-y-1"}>
            {filteredSystem.map((group) =>
              compact ? (
                <RailGroup
                  key={group.id}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                />
              ) : (
                <ExpandedGroup
                  key={`${group.id}-${
                    group.items.some((item) => itemMatchesPath(item, path))
                      ? path
                      : "idle"
                  }-${mobile ? "mobile" : "desktop"}`}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                  mobile={mobile}
                />
              ),
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* OPTIONAL PROCUREMENT (PRESERVED)                         */}
          {/* ═════════════════════════════════════════════════════════ */}
          {filteredProcurement.length > 0 && (
            <>
              <div className="my-2 border-t border-slate-100" />
              {!compact ? (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setProcurementOpen(!procurementOpen)}
                    className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-700"
                  >
                    <span>Procurement (Optional)</span>
                    <ChevronRight
                      size={12}
                      className={`transition-transform duration-150 ${
                        procurementOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {procurementOpen && (
                    <div className="mt-1 space-y-0.5">
                      {filteredProcurement.map((item) => (
                        <NavLink
                          key={item.id}
                          item={item}
                          path={path}
                          compact={compact}
                          onNavigate={finishNavigation}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      onClick={() => setProcurementOpen(!procurementOpen)}
                      className="sidebar-rail-link opacity-70"
                      aria-label="Procurement modules"
                    >
                      <Files size={18} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={12}
                      className="z-[80] rounded-lg bg-foreground px-3 py-2 text-xs text-white"
                    >
                      Procurement (Material Requests & POs)
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )}
            </>
          )}

          {/* ShipFlow Logistics Assistant Widget */}
          {!compact && (
            <div className="mt-4 pt-1">
              <button
                type="button"
                onClick={openSearch}
                className="flex w-full items-center justify-between rounded-lg border bg-card p-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                title="ShipFlow Assistant (⌘J / ⌘K)"
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Sparkles size={13} />
                  </div>
                  <span>ShipFlow AI</span>
                </div>
                <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}
        </nav>

        {/* Footer & User Profile Row */}
        {compact ? (
          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-slate-100 bg-white py-3">
            <button
              type="button"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="sidebar-icon-button"
              onClick={props.onToggleCompact}
            >
              <PanelLeftOpen size={18} />
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  title={props.user.name}
                  className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs hover:opacity-90 transition-opacity"
                >
                  {userInitials}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="right"
                  align="end"
                  sideOffset={12}
                  className={menuClass}
                >
                  <DropdownMenu.Label className="px-3 py-2">
                    <span className="block text-xs font-semibold">
                      {props.user.name}
                    </span>
                    <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground">
                      {props.user.email}
                    </span>
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <MenuLink href="/dashboard" onNavigate={finishNavigation}>
                    My workspace
                  </MenuLink>
                  <MenuLink href="/organizations" onNavigate={finishNavigation}>
                    Organizations
                  </MenuLink>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={() => void props.onLogout()}
                    className="sidebar-menu-item text-red-600"
                  >
                    <LogOut size={14} />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-3 py-2.5">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  title={props.user.name}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 text-left outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs">
                    {userInitials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-900">
                      {props.user.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-400 capitalize">
                      {props.organization?.role || "Member"} ·{" "}
                      {props.organization?.country_code || "SEA"}
                    </span>
                  </span>
                  <ChevronDown size={12} className="shrink-0 text-slate-400" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={10}
                  className={menuClass}
                >
                  <DropdownMenu.Label className="px-3 py-2">
                    <span className="block text-xs font-semibold">
                      {props.user.name}
                    </span>
                    <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground">
                      {props.user.email}
                    </span>
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <MenuLink href="/dashboard" onNavigate={finishNavigation}>
                    My workspace
                  </MenuLink>
                  <MenuLink href="/organizations" onNavigate={finishNavigation}>
                    Organizations
                  </MenuLink>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={() => void props.onLogout()}
                    className="sidebar-menu-item text-red-600"
                  >
                    <LogOut size={14} />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button
              type="button"
              onClick={props.onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="sidebar-icon-button shrink-0 text-slate-400 hover:text-red-600"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        aria-label="Workspace sidebar"
        data-compact={props.compact}
        className="workspace-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white lg:flex"
      >
        {content(props.compact, false)}
      </aside>

      {/* Mobile Drawer */}
      <Dialog open={props.mobileOpen} onOpenChange={props.onMobileOpenChange}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!searchOpen)
              document.getElementById("workspace-menu-toggle")?.focus();
          }}
          className="left-0 top-0 flex h-dvh w-[min(300px,calc(100vw-24px))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-r bg-white p-0 ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
          <DialogDescription className="sr-only">
            ShipFlow logistics modules, dispatch, fleet, and settings.
          </DialogDescription>
          {content(false, true)}
        </DialogContent>
      </Dialog>

      {/* Quick Search Dialog */}
      <NavigationSearch
        key={searchOpen ? "open" : "closed"}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        can={props.can}
        onNavigate={finishNavigation}
      />

      {/* My Tasks Sheet Drawer */}
      <Sheet open={tasksOpen} onOpenChange={setTasksOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white">
          <SheetHeader className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900">
                <ListTodo size={16} />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-slate-900">My Operational Tasks</SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Priority action items requiring your verification
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-950">Review OCR Discrepancies</span>
                <span className="rounded bg-blue-200/80 px-1.5 py-0.2 text-[9px] font-bold text-blue-900 uppercase">High Priority</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Container weight mismatch detected on B/L RCLY261030704 for shipment SHP-2026-0042.
              </p>
              <div className="pt-2">
                <Link
                  href="/documents/reconciliation"
                  onClick={() => setTasksOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                >
                  Open Reconciliation Studio <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-950">Approve Transport Order Tenders</span>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 uppercase">Medium</span>
              </div>
              <p className="text-[11px] text-slate-600">
                2 carrier quotes received for route Phnom Penh Logistics Park → Sihanoukville Port.
              </p>
              <div className="pt-2">
                <Link
                  href="/transport/trips"
                  onClick={() => setTasksOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                >
                  View Dispatch Run-Sheets <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Customs SAD Verification</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 uppercase">Normal</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Lodge customs declaration with ASYCUDA before vessel estimated time of departure.
              </p>
              <div className="pt-2">
                <Link
                  href="/customs"
                  onClick={() => setTasksOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                >
                  Open Customs SAD <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Tooltip.Provider>
  );
}

function NavLink({
  item,
  path,
  compact = false,
  onNavigate,
}: {
  item: NavigationItem;
  path: string;
  compact?: boolean;
  onNavigate: () => void;
}) {
  const active = itemMatchesPath(item, path);
  if (!item.href)
    return (
      <button
        type="button"
        disabled
        className="sidebar-child sidebar-child-planned"
        title={`${item.description}. Planned for a future release.`}
      >
        <item.icon size={14} />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="sidebar-planned">Planned</span>
      </button>
    );

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={compact ? item.label : undefined}
      className={`${compact ? "sidebar-rail-link" : "sidebar-live-link"} ${
        active ? "is-active font-semibold" : ""
      }`}
    >
      <item.icon size={compact ? 20 : 15} />
      {!compact && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded bg-blue-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-blue-800">
              {item.badge}
            </span>
          )}
          {active && !item.badge ? (
            <Pin size={11} className="shrink-0 rotate-45 text-blue-700" />
          ) : (
            <span className="size-1 shrink-0 rounded-full bg-transparent" />
          )}
        </>
      )}
    </Link>
  );

  return compact ? (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="z-[80] rounded-lg bg-foreground px-3 py-2 text-xs text-white shadow-lg"
        >
          {item.label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  ) : (
    link
  );
}

function ExpandedGroup({
  group,
  path,
  onNavigate,
  mobile,
}: {
  group: NavigationGroup;
  path: string;
  onNavigate: () => void;
  mobile: boolean;
}) {
  const active = group.items.some((item) => itemMatchesPath(item, path));
  const [open, setOpen] = useState(active || group.defaultOpen || false);
  const planned = group.items.every((item) => !item.href);
  const id = `${mobile ? "mobile" : "desktop"}-nav-${group.id}`;

  return (
    <div className="sidebar-group">
      <button
        type="button"
        className={`sidebar-group-trigger ${active ? "is-active" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <group.icon size={16} />
        <span className="flex-1 text-left truncate">{group.label}</span>
        {planned && <span className="sidebar-planned">Planned</span>}
        <ChevronRight
          size={13}
          className={`shrink-0 transition-transform duration-150 ${
            open ? "rotate-90" : ""
          } ${active ? "text-blue-200" : "text-muted-foreground"}`}
        />
      </button>
      <div id={id} hidden={!open} className="sidebar-children">
        {group.items.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            path={path}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function RailGroup({
  group,
  path,
  onNavigate,
}: {
  group: NavigationGroup;
  path: string;
  onNavigate: () => void;
}) {
  const active = group.items.some((item) => itemMatchesPath(item, path));
  return (
    <DropdownMenu.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={group.label}
              className={`sidebar-rail-link ${active ? "is-active" : ""}`}
            >
              <group.icon size={20} />
            </button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={12}
            className="z-[80] rounded-lg bg-foreground px-3 py-2 text-xs text-white"
          >
            {group.label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="start"
          sideOffset={12}
          className={menuClass}
        >
          <DropdownMenu.Label className="px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </DropdownMenu.Label>
          {group.items.map((item) =>
            item.href ? (
              <DropdownMenu.Item key={item.id} asChild>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={
                    itemMatchesPath(item, path) ? "page" : undefined
                  }
                  className={`sidebar-menu-item ${
                    itemMatchesPath(item, path) ? "is-active text-primary bg-blue-50" : ""
                  }`}
                >
                  <item.icon size={15} />
                  <span className="flex-1">{item.label}</span>
                  <ArrowUpRight size={12} />
                </Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={item.id}
                disabled
                className="sidebar-menu-item opacity-45"
              >
                <item.icon size={15} />
                <span className="flex-1">{item.label}</span>
                <span className="sidebar-planned">Planned</span>
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link href={href} onClick={onNavigate} className="sidebar-menu-item">
        <span className="flex-1">{children}</span>
        <ArrowUpRight size={13} />
      </Link>
    </DropdownMenu.Item>
  );
}
