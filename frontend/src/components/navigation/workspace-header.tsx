"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Plus,
  ChevronDown,
  Building2,
  Check,
  Loader2,
  Ship,
  FileText,
  Truck,
  FileUp,
  UserPlus,
  Bell,
  Settings,
  Users,
  Shield,
  LogOut,
} from "lucide-react";
import type { User, Organization } from "@/lib/types";
import { useHeaderContext } from "./header-context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type WorkspaceHeaderProps = {
  organization: Organization | null;
  organizations: Organization[];
  user: User;
  location: { group: string; label: string };
  can: (permission: string) => boolean;
  switching: boolean;
  onSwitch: (id: string) => Promise<void>;
  onLogout: () => Promise<void>;
  mobileOpen: boolean;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
};

export function WorkspaceHeader({
  organization,
  organizations,
  user,
  location,
  can,
  switching,
  onSwitch,
  onLogout,
  mobileOpen,
  onOpenMobileMenu,
  onOpenSearch,
}: WorkspaceHeaderProps) {
  const { config } = useHeaderContext();
  const [isLoggingOut, startLogout] = useTransition();

  // Keyboard shortcut '/' to focus quick search
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        const input = document.getElementById("workspace-quick-search") as HTMLInputElement | null;
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const orgInitial = organization?.name
    ? organization.name.charAt(0).toUpperCase()
    : "M";

  const hubCountry = organization?.country_code || "KH";
  const hubCity = organization?.city || (hubCountry === "KH" ? "Phnom Penh" : "Regional");

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
        {/* Left side: Mobile Toggle, Org Switcher / Page Title Pill / Segment Pills */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Toggle */}
          <button
            onClick={onOpenMobileMenu}
            id="workspace-menu-toggle"
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="workspace-mobile-navigation"
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu size={18} />
          </button>

          {/* Segment Pills (e.g. Inbound | Outbound | Configuration) */}
          {config?.segmentPills && config.segmentPills.length > 0 ? (
            <div className="flex items-center rounded-lg border border-slate-200/90 bg-slate-100/70 p-0.5">
              {config.segmentPills.map((seg) => {
                const isAct = config.activeSegment === seg.id;
                const SegIcon = seg.icon;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => config.onSegmentChange?.(seg.id)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      isAct
                        ? "bg-white text-blue-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {SegIcon && (
                      <SegIcon
                        size={13}
                        className={isAct ? "text-blue-700" : "text-slate-400"}
                      />
                    )}
                    <span>{seg.label}</span>
                  </button>
                );
              })}
            </div>
          ) : config?.title ? (
            /* Page Identity Pill (e.g. [🚛 Freight Requests]) */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-2xs">
                {config.icon && <config.icon size={14} className="text-blue-900" />}
                <span>{config.title}</span>
                {config.badge && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-blue-800 uppercase">
                    {config.badge}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Title */}
              <span className="truncate text-xs font-semibold text-slate-900 sm:hidden">
                {location.label}
              </span>

              {/* Fleetbase-inspired Org Switcher Pill */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={switching}
                      className="group flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      title={organization?.name || "Select organization"}
                    >
                      {/* Org Avatar Letter Badge */}
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-950 font-mono text-[11px] font-bold text-white shadow-2xs ring-1 ring-black/10">
                        {switching ? (
                          <Loader2 className="size-3 animate-spin text-white" />
                        ) : (
                          orgInitial
                        )}
                      </div>

                      {/* Org Name & Hub Badge */}
                      <div className="flex items-center gap-1.5 text-left">
                        <span className="max-w-[110px] truncate text-xs font-semibold text-slate-800 sm:max-w-[160px] md:max-w-[200px]">
                          {organization?.name || "Organization"}
                        </span>
                        <span className="hidden rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono font-medium text-slate-600 uppercase border border-slate-200/60 sm:inline-block">
                          {hubCountry}
                        </span>
                      </div>

                      <ChevronDown className="size-3 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="w-64 p-1.5">
                    <DropdownMenuLabel className="text-[10px] text-slate-400">
                      SWITCH WORKSPACE
                    </DropdownMenuLabel>
                    <div className="max-h-60 overflow-y-auto">
                      <DropdownMenuRadioGroup
                        value={String(organization?.id || "")}
                        onValueChange={(val) => {
                          if (val && val !== String(organization?.id)) {
                            void onSwitch(val);
                          }
                        }}
                      >
                        {organizations.map((org) => (
                          <DropdownMenuRadioItem
                            key={org.id}
                            value={String(org.id)}
                            disabled={switching}
                            className="flex items-center gap-2 py-2 text-xs"
                          >
                            <div className="flex size-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium text-slate-800">
                                {org.name}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {org.role || "Member"} · {org.country_code}
                              </span>
                            </div>
                            {organization?.id === org.id && (
                              <Check className="size-3.5 text-blue-700" />
                            )}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link
                        href="/organizations/new"
                        className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900"
                      >
                        <Plus className="size-3.5" />
                        <span>Create new organization</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/organizations"
                        className="flex items-center gap-2 text-xs text-slate-600"
                      >
                        <Building2 className="size-3.5" />
                        <span>Manage all organizations</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Divider */}
              <div className="hidden h-4 w-px bg-slate-200 md:block" />

              {/* Breadcrumb Context */}
              <div className="hidden items-center gap-1.5 text-xs md:flex">
                <span className="text-slate-400">{location.group}</span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-800">{location.label}</span>
              </div>
            </>
          )}
        </div>

        {/* Center: Tabs Bar and/or Quick Search */}
        {(config?.tabs || config?.onSearchChange) ? (
          <div className="mx-2 flex flex-1 items-center gap-3 overflow-hidden px-2">
            {/* Quick Search input with '/' shortcut (Vektor style) */}
            {config.onSearchChange && (
              <div className="relative w-36 sm:w-48 shrink-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="workspace-quick-search"
                  placeholder={config.searchPlaceholder || "Search... /"}
                  value={config.searchValue || ""}
                  onChange={(e) => config.onSearchChange?.(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200/90 bg-slate-50/70 pl-8 pr-6 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1 font-mono text-[9px] text-slate-400 shadow-2xs">
                  /
                </kbd>
              </div>
            )}

            {/* Vektor Tabs with active blue bottom underline */}
            {config.tabs && config.tabs.length > 0 && (
              <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {config.tabs.map((tab) => {
                  const isActive = config.activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => config.onTabChange?.(tab.id)}
                      className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-xs transition-colors ${
                        isActive
                          ? "font-semibold text-blue-900"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {TabIcon && (
                        <TabIcon
                          size={13}
                          className={isActive ? "text-blue-700" : "text-slate-400"}
                        />
                      )}
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                            isActive
                              ? "bg-blue-100 text-blue-900"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-700" />
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        ) : (
          /* Default Global Command Search Bar (⌘K) */
          <div className="mx-2 hidden max-w-sm flex-1 sm:flex md:max-w-md lg:max-w-lg">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search navigation and resources"
              className="group flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 text-xs text-slate-500 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="size-3.5 text-slate-400 transition-colors group-hover:text-blue-600" />
                <span className="truncate">
                  Search shipments, ASYCUDA SAD, fleet...
                </span>
              </div>
              <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 shadow-2xs sm:inline-flex">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Right side: Operations Hub Telemetry, Bell, User Profile, and Primary "+ New" Action */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Operations Hub Live Telemetry Badge */}
          <div
            className="hidden items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-medium text-emerald-800 lg:flex"
            title={`Connected to ${hubCity} Gateway & ASYCUDA Online`}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase">
              {hubCountry}
            </span>
            <span className="text-emerald-700">·</span>
            <span>{hubCity} Hub</span>
          </div>

          {/* Audit & Security Activity Bell */}
          <Link
            href="/audit"
            className="relative hidden sm:flex size-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Security & Operational Audit Log"
          >
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
          </Link>

          {/* User Profile Avatar with Vektor-style live online indicator */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex size-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white shadow-2xs ring-2 ring-slate-100 transition-transform hover:scale-102 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                title={`${user.name} (${user.email})`}
              >
                {userInitials}
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <div className="border-b border-slate-100 px-2.5 py-2">
                <div className="truncate text-xs font-semibold text-slate-900">
                  {user.name}
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {user.email}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="rounded px-1.5 py-0 text-[10px] font-medium capitalize"
                  >
                    {organization?.role || "Member"}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    {organization?.country_code || "SEA"}
                  </span>
                </div>
              </div>

              <DropdownMenuLabel className="pt-2 text-[10px] text-slate-400">
                PREFERENCES & TEAM
              </DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 text-xs text-slate-700"
                >
                  <Settings className="size-3.5 text-slate-400" />
                  <span>Organization Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/team"
                  className="flex items-center gap-2 text-xs text-slate-700"
                >
                  <Users className="size-3.5 text-slate-400" />
                  <span>Team & Members</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/audit"
                  className="flex items-center gap-2 text-xs text-slate-700"
                >
                  <Shield className="size-3.5 text-slate-400" />
                  <span>Audit & Security Logs</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={isLoggingOut}
                onClick={() => {
                  startLogout(async () => {
                    await onLogout();
                  });
                }}
                className="flex items-center gap-2 text-xs text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                {isLoggingOut ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LogOut className="size-3.5" />
                )}
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary Action "+ New" Button placed consistently on the far right */}
          {config?.primaryAction ? (
            <div className="flex items-center">{config.primaryAction}</div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-900 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  title="Quick Create"
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">New</span>
                  <ChevronDown className="size-3 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuLabel className="text-[10px] text-slate-400">
                  CREATE OPERATION
                </DropdownMenuLabel>

                {can("freight:create") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/freight/shipments"
                      className="flex items-center gap-2.5 py-2 text-xs"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                        <Ship className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">New Shipment</div>
                        <div className="text-[10px] text-slate-400">Ocean, Air or Land freight</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {can("customs:create") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/customs"
                      className="flex items-center gap-2.5 py-2 text-xs"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                        <FileText className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Lodge ASYCUDA SAD</div>
                        <div className="text-[10px] text-slate-400">Customs declaration</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {can("transport:create") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/transport/trips"
                      className="flex items-center gap-2.5 py-2 text-xs"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                        <Truck className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Dispatch Trip</div>
                        <div className="text-[10px] text-slate-400">Fleet route assignment</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {can("document:upload") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/documents"
                      className="flex items-center gap-2.5 py-2 text-xs"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                        <FileUp className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Upload Document</div>
                        <div className="text-[10px] text-slate-400">BL, Invoice, Packing list</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {can("partner:create") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/partners/new"
                      className="flex items-center gap-2.5 py-2 text-xs"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md bg-purple-50 text-purple-700">
                        <UserPlus className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Add Partner</div>
                        <div className="text-[10px] text-slate-400">Shipper, Consignee, Carrier</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Row 2: Sub-Header / Secondary Filter Toolbar */}
      {config?.subHeader && (
        <div className="sticky top-16 z-20 flex min-h-11 w-full flex-wrap items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 py-1.5 backdrop-blur-md gap-2">
          {config.subHeader}
        </div>
      )}
    </>
  );
}
