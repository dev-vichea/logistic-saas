"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type ColDef, type ColGroupDef } from "ag-grid-community";
import { type CustomCellRendererProps } from "ag-grid-react";
import {
  Plus,
  ArrowUpRight,
  Users,
  MapPin,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import {
  NoOrganization,
  Loading,
  ErrorBox,
  Empty,
  Pagination,
} from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  partnerRoot,
  type Partner,
  type PartnerPage,
  type PartnerCatalog,
} from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { Input } from "@/components/ui/input";
import { PartnerStatus } from "./fields";
import {
  WorkspaceHeaderSlot,
  FloatingFilterSelect,
  ViewPresetSelector,
  FilterResetButton,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

const directoryTitles = { carrier: "Carriers", broker: "Brokers" };

export function PartnerList({
  contactsMode = false,
  directoryRole,
}: {
  contactsMode?: boolean;
  directoryRole?: keyof typeof directoryTitles;
}) {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [tab, setTab] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("default");
  const [page, setPage] = useState(1);
  const title = directoryRole
    ? directoryTitles[directoryRole]
    : contactsMode ? "Contacts & Sites" : "Business Partners";
  const allowed = can("partners.view");

  const catalogRes = useResource<{ data: PartnerCatalog }>(
    organization && allowed ? `${partnerRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  queryParams.set("per_page", directoryRole ? "25" : "100");
  if (search.trim()) queryParams.set("q", search.trim());

  if (directoryRole) {
    queryParams.set("role", directoryRole);
    queryParams.set("page", String(page));
    queryParams.set("status", statusFilter);
  } else if (tab === "shipper") queryParams.set("role", "shipper");
  else if (tab === "carrier") queryParams.set("role", "carrier");
  else if (tab === "broker") queryParams.set("role", "broker");
  else if (tab === "archived") queryParams.set("status", "archived");
  else {
    if (roleFilter !== "all") queryParams.set("role", roleFilter);
    if (statusFilter !== "all") queryParams.set("status", statusFilter);
  }

  if (countryFilter !== "all") queryParams.set("country_code", countryFilter);

  const partnersRes = useResource<PartnerPage>(
    organization && allowed ? `${partnerRoot(organization.id)}?${queryParams.toString()}` : null
  );

  const catalog = catalogRes.data?.data;
  const rawPartners = useMemo(
    () => partnersRes.data?.data || [],
    [partnersRes.data?.data]
  );

  const hasActiveFilters =
    roleFilter !== "all" ||
    countryFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim() !== "";

  const resetAllFilters = () => {
    setPage(1);
    setRoleFilter("all");
    setCountryFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  const updateSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const columnDefs = useMemo<(ColDef<Partner> | ColGroupDef<Partner>)[]>(() => {
    const allCols: (ColDef<Partner> | ColGroupDef<Partner>)[] = [
      {
        headerName: "Partner Name",
        field: "name",
        minWidth: directoryRole ? 240 : 200,
        pinned: "left",
        cellRenderer: (params: CustomCellRendererProps<Partner>) => {
          const partner = params.data;
          if (!partner) return null;
          return (
            <div className="flex items-center gap-2 h-full">
              <span className="flex size-7 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-900 border border-blue-200/60">
                <Building2 size={13} />
              </span>
              <div className="flex flex-col min-w-0 leading-tight">
                <Link
                  href={`/partners/${partner.id}`}
                  title={partner.name}
                  className="font-semibold text-slate-900 hover:text-blue-900 truncate text-xs"
                >
                  {partner.name}
                </Link>
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  {partner.code || "Partner #" + partner.id}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "Organization & Roles",
        headerClass: "ag-group-shipper",
        children: [
          {
            headerName: "Business Roles",
            field: "roles",
            minWidth: 160,
            flex: 1,
            valueGetter: (params) =>
              params.data?.roles.map((r) => catalog?.roles[r] || r).join(", ") || "",
            cellRenderer: (params: CustomCellRendererProps<Partner>) => {
              const partner = params.data;
              if (!partner) return null;
              return (
                <div className="flex items-center h-full text-xs font-medium text-slate-700">
                  {partner.roles.map((role: string) => catalog?.roles[role] || role).join(", ")}
                </div>
              );
            },
          },
          {
            headerName: "Country",
            field: "country_code",
            width: 120,
            valueGetter: (params) =>
              params.data ? catalog?.countries[params.data.country_code] || params.data.country_code : "",
            cellRenderer: (params: CustomCellRendererProps<Partner>) => {
              const partner = params.data;
              if (!partner) return null;
              return (
                <span className="text-xs text-slate-700 font-mono">
                  {catalog?.countries[partner.country_code] || partner.country_code}
                </span>
              );
            },
          },
        ],
      },
      {
        headerName: "Contact & Network",
        headerClass: "ag-group-service",
        children: [
          {
            headerName: "Direct Contact",
            minWidth: 175,
            flex: 1.1,
            cellRenderer: (params: CustomCellRendererProps<Partner>) => {
              const partner = params.data;
              if (!partner) return null;
              return (
                <div className="flex items-center gap-1.5 h-full text-xs text-slate-700 truncate">
                  {partner.email ? (
                    <>
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{partner.email}</span>
                    </>
                  ) : partner.phone ? (
                    <>
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{partner.phone}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">No direct contact</span>
                  )}
                </div>
              );
            },
          },
          {
            headerName: "Directory Sites",
            width: 150,
            cellRenderer: (params: CustomCellRendererProps<Partner>) => {
              const partner = params.data;
              if (!partner) return null;
              return (
                <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                  <span className="flex items-center gap-1">
                    <Users size={11} className="text-slate-400" />
                    <span>{partner.contacts_count}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    <span>{partner.locations_count} sites</span>
                  </span>
                </div>
              );
            },
          },
        ],
      },
      {
        headerName: "Status",
        field: "archived_at",
        width: 110,
        floatingFilter: false,
        cellRenderer: (params: CustomCellRendererProps<Partner>) => {
          const partner = params.data;
          if (!partner) return null;
          return (
            <div className="flex items-center h-full">
              <PartnerStatus archived={Boolean(partner.archived_at)} />
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        width: 95,
        pinned: "right",
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: CustomCellRendererProps<Partner>) => {
          const partner = params.data;
          if (!partner) return null;
          return (
            <div className="flex items-center justify-end h-full">
              <Link href={`/partners/${partner.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-900 hover:text-blue-800 hover:bg-blue-50 gap-1"
                >
                  <span>Profile</span>
                  <ArrowUpRight size={13} />
                </Button>
              </Link>
            </div>
          );
        },
      },
    ];

    if (directoryRole) {
      return allCols.filter((col) => col.headerName !== "Actions");
    }
    if (activeView === "roles") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Partner Name", "Organization & Roles", "Status", "Actions"].includes(name || "");
      });
    }
    if (activeView === "network") {
      return allCols.filter((col) => {
        const name = "headerName" in col ? col.headerName : "";
        return ["Partner Name", "Contact & Network", "Status", "Actions"].includes(name || "");
      });
    }
    return allCols;
  }, [catalog, activeView, directoryRole]);

  if (!organization) return <NoOrganization />;
  if (!allowed)
    return <ErrorBox message="You do not have access to the partner directory." />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (!catalogRes.data) return <Loading />;

  return (
    <div className="flex flex-col h-full w-full">
      {directoryRole && <h1 className="sr-only">{title}</h1>}
      <WorkspaceHeaderSlot
        fullWidth={true}
        title={title}
        icon={Building2}
        tabs={directoryRole ? undefined : [
          { id: "all", label: "All Partners", count: rawPartners.length },
          { id: "shipper", label: "Shippers / Clients" },
          { id: "carrier", label: "Carriers & Fleet" },
          { id: "broker", label: "Customs Brokers" },
          { id: "archived", label: "Archived" },
        ]}
        activeTab={tab}
        onTabChange={(newTab) => {
          setTab(newTab);
        }}
        searchValue={search}
        onSearchChange={directoryRole ? undefined : updateSearch}
        searchPlaceholder="Search company, code, contact or site..."
        primaryAction={
          directoryRole ? (
            <Button asChild variant="outline">
              <Link href="/partners">All partners</Link>
            </Button>
          ) : can("partners.manage") ? (
            <Link href="/partners/new">
              <Button className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white shadow-xs text-xs font-semibold px-3.5">
                <Plus size={14} />
                <span>Add Partner</span>
              </Button>
            </Link>
          ) : undefined
        }
        subHeader={
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              {directoryRole ? (
                <Input
                  type="search"
                  aria-label={`Search ${title.toLowerCase()}`}
                  placeholder={`Search ${title.toLowerCase()}…`}
                  maxLength={120}
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  className="h-9 w-full placeholder:text-muted-foreground sm:w-52"
                />
              ) : (
                <FloatingFilterSelect
                  label="Role"
                  value={roleFilter}
                  allLabel="All Roles"
                  options={Object.entries(catalog?.roles || {}).map(([val, lbl]) => ({
                    value: val,
                    label: lbl,
                  }))}
                  onChange={setRoleFilter}
                  minWidth="min-w-[130px]"
                />
              )}
              <FloatingFilterSelect
                label="Country"
                value={countryFilter}
                allLabel="All Countries"
                options={Object.entries(catalog?.countries || {}).map(([code, name]) => ({
                  value: code,
                  label: `${code} - ${name}`,
                }))}
                onChange={(value) => {
                  setPage(1);
                  setCountryFilter(value);
                }}
                minWidth="min-w-[140px]"
              />
              <FloatingFilterSelect
                label="Status"
                value={statusFilter}
                allLabel="All Statuses"
                options={[
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
                onChange={(value) => {
                  setPage(1);
                  setStatusFilter(value);
                }}
                minWidth="min-w-[115px]"
              />
              {hasActiveFilters && (
                <FilterResetButton onReset={resetAllFilters} />
              )}
            </div>
            {!directoryRole && (
              <div className="flex items-center gap-2 shrink-0">
                <ViewPresetSelector
                  activeView={activeView}
                  presets={[
                    { id: "default", label: "Default View", desc: "All company details & contacts" },
                    { id: "roles", label: "Roles & Regions", desc: "Shipper/carrier & country" },
                    { id: "network", label: "Sites & Network", desc: "Phone, email & locations" },
                  ]}
                  onSelectView={setActiveView}
                />
                <ViewSettingsButton onClick={resetAllFilters} />
              </div>
            )}
          </>
        }
      />

      {partnersRes.error ? (
        <div className="p-6">
          <ErrorBox message={partnersRes.error} />
        </div>
      ) : !partnersRes.data ? (
        <Loading />
      ) : rawPartners.length === 0 ? (
        <div className="p-8">
          <Empty
            title={directoryRole ? `No ${title.toLowerCase()} found` : "No Partners Found"}
            description={directoryRole
              ? "Adjust your filters or check the roles assigned to companies in the partner directory."
              : "Add your first business partner or adjust your search and filters."}
            action={
              !directoryRole && can("partners.manage") ? (
                <Link href="/partners/new">
                  <Button className="gap-2 bg-blue-900 text-white">
                    <Plus size={15} />
                    Add Partner
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <MekongDataGrid<Partner>
          rowData={rawPartners}
          columnDefs={columnDefs}
          title={directoryRole ? undefined : "Directory of Business Partners"}
          enableQuickFilter={!directoryRole}
          enableSelection={!directoryRole}
          showRowNumbers={!directoryRole}
          quickFilterPlaceholder="Quick search partners..."
          className="flex-1 min-h-0"
          gridOptions={directoryRole ? { pagination: false } : undefined}
        />
      )}
      {directoryRole && partnersRes.data && partnersRes.data.last_page > 1 && (
        <div className="shrink-0 border-t px-4 pb-4">
          <Pagination
            page={partnersRes.data.current_page}
            last={partnersRes.data.last_page}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
