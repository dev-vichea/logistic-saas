"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, Tooltip } from "radix-ui";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Ellipsis,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  X,
  Loader2,
  ArrowUpRight,
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
};
const menuClass =
  "sidebar-menu z-[70] min-w-56 max-w-80 rounded-xl border bg-white p-1.5 text-foreground shadow-xl";
export function WorkspaceSidebar(props: Props) {
  const { onMobileOpenChange } = props;
  const path = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onMobileOpenChange(false);
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onMobileOpenChange]);
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
  function content(compact: boolean, mobile: boolean) {
    return (
      <>
        <div
          className={`flex h-[76px] shrink-0 items-center ${compact ? "justify-center px-3" : "justify-between px-5"}`}
        >
          <Link
            href="/dashboard"
            aria-label="Mekong home"
            onClick={finishNavigation}
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
        <div className={compact ? "px-3" : "px-4"}>
          {compact ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Switch organization"
                  title={props.organization?.name || "Organizations"}
                  className="relative flex h-12 w-full items-center justify-center rounded-xl border bg-muted/40 text-primary"
                >
                  {props.switching ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Building2 size={21} />
                  )}
                  <ChevronDown
                    size={10}
                    className="absolute bottom-1 right-1"
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
                          <Building2 size={15} />
                          <span className="min-w-0 flex-1 truncate">
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
            <div className="rounded-xl border bg-[#f9fbfa] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-white text-primary">
                  <Building2 size={14} />
                </span>
                <span className="flex-1 text-[9px] font-semibold tracking-[.14em] text-muted-foreground">
                  YOUR WORKSPACE
                </span>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="sidebar-icon-button !size-6"
                      aria-label="Workspace actions"
                      type="button"
                    >
                      <Ellipsis size={16} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      sideOffset={8}
                      align="end"
                      className={menuClass}
                    >
                      <MenuLink
                        href="/organizations"
                        onNavigate={finishNavigation}
                      >
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
              </div>
              <div className="relative">
                <select
                  aria-label="Switch organization"
                  value={props.organization?.id || ""}
                  onChange={(event) => props.onSwitch(event.target.value)}
                  disabled={props.switching}
                  className="w-full appearance-none truncate rounded bg-transparent pr-6 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {props.organizations.length ? (
                    props.organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Create a workspace</option>
                  )}
                </select>
                {props.switching ? (
                  <Loader2
                    size={13}
                    className="absolute right-0 top-1 animate-spin text-primary"
                  />
                ) : (
                  <ChevronsUpDown
                    size={13}
                    className="pointer-events-none absolute right-0 top-1 text-muted-foreground"
                  />
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="capitalize">
                  {props.organization?.role || "Personal workspace"}
                </span>
                <span className="ml-auto">
                  {props.organization?.country_code || "SEA"}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className={compact ? "px-3 py-4" : "px-4 pt-4 pb-3"}>
          <button
            type="button"
            id={mobile ? "mobile-sidebar-search" : "sidebar-search"}
            aria-label="Search navigation"
            onClick={openSearch}
            title="Search navigation (Ctrl/⌘ K)"
            className={`sidebar-search ${compact ? "justify-center px-0" : "px-3"}`}
          >
            <Search size={16} />
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
        <nav
          aria-label="Main navigation"
          className={`sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 ${compact ? "px-3" : "px-3"}`}
        >
          {!compact && (
            <p className="px-3 pt-1 pb-2 text-[9px] font-semibold tracking-[.15em] text-muted-foreground">
              WORKSPACE
            </p>
          )}
          <NavLink
            item={overview}
            path={path}
            compact={compact}
            onNavigate={finishNavigation}
          />
          {!compact && <div className="my-3 mx-3 border-t" />}
          <div className={compact ? "mt-3 space-y-1.5" : "space-y-1"}>
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
                  key={`${group.id}-${group.items.some((item) => itemMatchesPath(item, path)) ? path : "idle"}-${mobile ? "mobile" : "desktop"}`}
                  group={group}
                  path={path}
                  onNavigate={finishNavigation}
                  mobile={mobile}
                />
              ),
            )}
          </div>
        </nav>
        <div
          className={`shrink-0 border-t ${compact ? "px-3 py-3" : "px-5 py-3"}`}
        >
          {compact ? (
            <button
              type="button"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="sidebar-icon-button w-full"
              onClick={props.onToggleCompact}
            >
              <PanelLeftOpen size={18} />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck size={13} className="text-primary" />
                Private workspace
              </span>
              <span className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                v0.2
              </span>
            </div>
          )}
        </div>
        <div
          className={`flex shrink-0 items-center border-t bg-[#fbfcfb] ${compact ? "flex-col gap-2 py-3" : "gap-1 px-3 py-3"}`}
        >
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                title={props.user.name}
                className={`flex min-w-0 items-center rounded-lg text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${compact ? "p-1" : "flex-1 gap-2.5 p-1.5"}`}
              >
                <span className="avatar !size-8">
                  {props.user.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                {!compact && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold">
                        {props.user.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {props.user.email}
                      </span>
                    </span>
                    <ChevronDown size={12} className="text-muted-foreground" />
                  </>
                )}
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
            className="sidebar-icon-button shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </>
    );
  }
  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        aria-label="Workspace sidebar"
        data-compact={props.compact}
        className="workspace-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-white lg:flex"
      >
        {content(props.compact, false)}
      </aside>
      <Dialog open={props.mobileOpen} onOpenChange={onMobileOpenChange}>
        <DialogContent
          id="workspace-mobile-navigation"
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
      className={`${compact ? "sidebar-rail-link" : "sidebar-live-link"} ${active ? "is-active" : ""}`}
    >
      <item.icon size={compact ? 20 : 15} />
      {!compact && (
        <>
          <span className="flex-1">{item.label}</span>
          {active && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
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
        <group.icon size={18} />
        <span className="flex-1 text-left">{group.label}</span>
        {planned && <span className="sidebar-planned">Planned</span>}
        <ChevronRight
          size={13}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
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
                  className={`sidebar-menu-item ${itemMatchesPath(item, path) ? "text-primary bg-emerald-50" : ""}`}
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
