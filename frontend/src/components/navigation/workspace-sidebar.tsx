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
  Package,
  Route,
  Landmark,
  Files,
} from "lucide-react";
import { Brand } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Organization, User } from "@/lib/types";
import {
  navigationGroups,
  overview,
  itemMatchesPath,
  type NavigationGroup,
  type NavigationItem,
} from "@/lib/navigation";
import { NavigationSearch } from "./navigation-search";

const compactKey = "mekong.sidebar.compact";
let memoryCompact = false;
let storageUnavailable = false;
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("mekong-sidebar", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("mekong-sidebar", listener);
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
    window.dispatchEvent(new Event("mekong-sidebar"));
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
  "sidebar-menu z-[70] min-w-56 max-w-80 rounded-xl border bg-white p-1.5 text-foreground shadow-xl";

export function WorkspaceSidebar(props: Props) {
  const { onMobileOpenChange, onSearchOpenChange } = props;
  const path = usePathname();
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [frequentOpen, setFrequentOpen] = useState(true);

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

  const groups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || props.can(item.permission),
      ),
    }))
    .filter((group) => group.items.length);

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
    : "M";

  const userInitials = props.user.name
    ? props.user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

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
            aria-label="Mekong home"
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

        {/* Vektor Organization Header Card with Native Select Underneath */}
        <div className={compact ? "px-3 pt-3" : "px-3 pt-3 pb-1"}>
          {compact ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Switch organization"
                  title={props.organization?.name || "Organizations"}
                  className="relative flex size-10 w-full items-center justify-center rounded-xl bg-blue-950 font-mono text-xs font-bold text-white shadow-2xs hover:bg-blue-900"
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
                  <DropdownMenu.Label className="px-3 py-2 text-[10px] font-semibold text-muted-foreground">
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
                      ? `MOC_REG: ${props.organization.registration_number}`
                      : `${props.organization?.country_code || "KH"} REG · ACTIVE`}
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
                <span className="flex-1 text-left">Search navigation</span>
                <kbd className="rounded border bg-white px-1 py-0.5 text-[9px] text-muted-foreground">
                  ⌘ K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav
          aria-label="Main navigation"
          className={`sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 ${
            compact ? "px-3" : "px-3"
          }`}
        >
          {/* Frequently Used Section (Vektor Style) */}
          {!compact && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setFrequentOpen(!frequentOpen)}
                className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-700"
              >
                <span>Frequently Used</span>
                <ChevronRight
                  size={12}
                  className={`transition-transform duration-150 ${
                    frequentOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
              {frequentOpen && (
                <div className="mt-1 space-y-0.5">
                  <Link
                    href="/freight/shipments"
                    aria-label="Quick Shipments"
                    onClick={finishNavigation}
                    className={`sidebar-live-link ${
                      path.startsWith("/freight/shipments") ? "is-active" : ""
                    }`}
                  >
                    <Package size={14} />
                    <span className="flex-1">Shipments</span>
                  </Link>
                  <Link
                    href="/transport/trips"
                    aria-label="Quick Dispatch"
                    onClick={finishNavigation}
                    className={`sidebar-live-link ${
                      path.startsWith("/transport/trips") ? "is-active" : ""
                    }`}
                  >
                    <Route size={14} />
                    <span className="flex-1">Dispatch runs</span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800">
                      Live
                    </span>
                  </Link>
                  <Link
                    href="/customs"
                    aria-label="Quick Customs"
                    onClick={finishNavigation}
                    className={`sidebar-live-link ${
                      path.startsWith("/customs") ? "is-active" : ""
                    }`}
                  >
                    <Landmark size={14} />
                    <span className="flex-1">Customs SAD</span>
                  </Link>
                  <Link
                    href="/documents"
                    aria-label="Quick Document Vault"
                    onClick={finishNavigation}
                    className={`sidebar-live-link ${
                      path.startsWith("/documents") ? "is-active" : ""
                    }`}
                  >
                    <Files size={14} />
                    <span className="flex-1">Document Vault</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {!compact && (
            <p className="px-2 pt-2 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              WORKSPACE
            </p>
          )}

          <NavLink
            item={overview}
            path={path}
            compact={compact}
            onNavigate={finishNavigation}
          />

          {!compact && <div className="my-2 mx-1 border-t border-slate-100" />}

          <div className={compact ? "mt-2 space-y-1.5" : "space-y-1"}>
            {groups.map((group) =>
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

          {/* Vektor AI Assistant Widget */}
          {!compact && (
            <div className="mt-4 pt-1">
              <button
                type="button"
                onClick={openSearch}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-blue-50/50 p-2 text-xs font-semibold text-slate-800 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50/80"
                title="Logistics Assistant (⌘J / ⌘K)"
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 text-white shadow-2xs">
                    <Sparkles size={13} />
                  </div>
                  <span className="font-semibold text-slate-800">
                    Assistant
                  </span>
                </div>
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 shadow-2xs">
                  ⌘J
                </kbd>
              </button>
            </div>
          )}

          {/* Vektor Company Setup Readiness Card */}
          {!compact && (
            <div className="mt-2.5">
              <div className="rounded-xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 to-slate-50 p-3 shadow-2xs">
                <Link
                  href="/settings"
                  onClick={finishNavigation}
                  className="group flex items-center justify-between text-xs font-bold text-blue-950 hover:text-blue-800"
                >
                  <span>Finish Company Setup</span>
                  <ChevronRight
                    size={13}
                    className="text-blue-700 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <div className="mt-1 text-[11px] text-slate-500">
                  Review ASYCUDA & Dispatch credentials
                </div>
                <div className="mt-2.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-blue-700 transition-all"
                      style={{ width: "75%" }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
                    <span>6 of 8 completed</span>
                    <span className="font-semibold text-blue-900">75%</span>
                  </div>
                </div>
              </div>
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
                  className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs hover:opacity-90"
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
                      {props.organization?.country_code || "KH"}
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
            Switch organizations and browse the platform modules.
          </DialogDescription>
          {content(false, true)}
        </DialogContent>
      </Dialog>

      <NavigationSearch
        key={searchOpen ? "open" : "closed"}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        can={props.can}
        onNavigate={finishNavigation}
      />
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
        <span className="flex-1">{item.label}</span>
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
          {active ? (
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
  const [open, setOpen] = useState(
    active || group.id === "network" || group.id === "settings",
  );
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
        <group.icon size={17} />
        <span className="flex-1 text-left">{group.label}</span>
        {planned && <span className="sidebar-planned">Planned</span>}
        <ChevronRight
          size={13}
          className={`shrink-0 transition-transform ${
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
          <DropdownMenu.Label className="px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground">
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
