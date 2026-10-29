"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type ColDef } from "ag-grid-community";
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
import { NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  partnerRoot,
  type Partner,
  type PartnerPage,
  type PartnerCatalog,
} from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { MekongDataGrid } from "@/components/ui/data-grid";
import { PartnerStatus } from "./fields";
import {
  WorkspaceHeaderSlot,
  FilterPill,
  SortPill,
  ViewSettingsButton,
} from "@/components/navigation/header-context";

export function PartnerList({
  contactsMode = false,
}: {
  contactsMode?: boolean;
}) {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [tab, setTab] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("name");

  const catalogRes = useResource<{ data: PartnerCatalog }>(
    organization ? `${partnerRoot(organization.id)}/catalog` : null
  );

  const queryParams = new URLSearchParams();
  queryParams.set("per_page", "100");
  if (search.trim()) queryParams.set("q", search.trim());

  if (tab === "shipper") queryParams.set("role", "shipper");
  else if (tab === "carrier") queryParams.set("role", "carrier");
  else if (tab === "customs_broker") queryParams.set("role", "customs_broker");
  else if (tab === "archived") queryParams.set("status", "archived");
  else {
    if (roleFilter !== "all") queryParams.set("role", roleFilter);
    if (statusFilter !== "all") queryParams.set("status", statusFilter);
  }

  if (countryFilter !== "all") queryParams.set("country_code", countryFilter);

  const partnersRes = useResource<PartnerPage>(
    organization ? `${partnerRoot(organization.id)}?${queryParams.toString()}` : null
  );

  const catalog = catalogRes.data?.data;
  const partners = partnersRes.data?.data || [];

  const columnDefs = useMemo<ColDef<Partner>[]>(
    () => [
      {
        headerName: "COMPANY / PARTNER",
        field: "name",
        minWidth: 260,
        flex: 1.5,
        cellRenderer: (params: CustomCellRendererProps<Partner>) => {
          const partner = params.data;
          if (!partner) return null;
          return (
            <div className="flex items-center gap-2.5 h-full py-1">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-900 border border-blue-200/60">
                <Building2 size={15} />
              </span>
              <div className="flex flex-col min-w-0 leading-tight">
                <Link
                  href={`/partners/${partner.id}`}
                  className="font-semibold text-slate-900 hover:text-blue-900 truncate"
                >
                  {partner.name}
                </Link>
                <span className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                  {partner.code || partner.legal_name || "Partner #" + partner.id}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "BUSINESS ROLES",
        field: "roles",
        minWidth: 190,
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
        headerName: "COUNTRY",
        field: "country_code",
        width: 140,
        valueGetter: (params) =>
          params.data ? catalog?.countries[params.data.country_code] || params.data.country_code : "",
        cellRenderer: (params: CustomCellRendererProps<Partner>) => {
          const partner = params.data;
          if (!partner) return null;
          return (
            <div className="flex items-center h-full text-xs text-slate-700">
              {catalog?.countries[partner.country_code] || partner.country_code}
            </div>
          );
        },
      },
      {
        headerName: "CONTACT & SITES",
        minWidth: 220,
        flex: 1,
        cellRenderer: (params: CustomCellRendererProps<Partner>) => {
          const partner = params.data;
          if (!partner) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1 leading-tight">
              <span className="text-xs text-slate-800 truncate flex items-center gap-1.5">
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
              </span>
              <div className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-500 font-mono">
                <Link
                  href={`/partners/${partner.id}#contacts`}
                  className="flex items-center gap-1 hover:text-blue-900"
                >
                  <Users size={11} className="text-slate-400" />
                  <span>{partner.contacts_count} contacts</span>
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  href={`/partners/${partner.id}#locations`}
                  className="flex items-center gap-1 hover:text-blue-900"
                >
                  <MapPin size={11} className="text-slate-400" />
                  <span>{partner.locations_count} sites</span>
                </Link>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "STATUS",
        field: "archived_at",
        width: 120,
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
        headerName: "ACTIONS",
        width: 100,
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
    ],
    [catalog]
  );

  if (!organization) return <NoOrganization />;
  if (catalogRes.error) return <ErrorBox message={catalogRes.error} />;
  if (partnersRes.error) return <ErrorBox message={partnersRes.error} />;
  if (!catalogRes.data) return <Loading />;

  return (
    <div className="flex flex-col h-full w-full">
      <WorkspaceHeaderSlot
        fullWidth={true}
        title={contactsMode ? "Contacts & Sites" : "Business Partners"}
        icon={Building2}
        tabs={[
          { id: "all", label: "All Partners", count: partners.length },
          { id: "shipper", label: "Shippers / Clients" },
          { id: "carrier", label: "Carriers & Fleet" },
          { id: "customs_broker", label: "Customs Brokers" },
          { id: "archived", label: "Archived" },
        ]}
        activeTab={tab}
        onTabChange={(newTab) => {
          setTab(newTab);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search company, code, contact or site..."
        primaryAction={
          can("partners.manage") ? (
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
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill
                label="Role"
                value={roleFilter}
                options={[
                  { value: "all", label: "All Roles" },
                  ...Object.entries(catalog?.roles || {}).map(([val, lbl]) => ({
                    value: val,
                    label: lbl,
                  })),
                ]}
                onChange={setRoleFilter}
              />
              <FilterPill
                label="Country"
                value={countryFilter}
                options={[
                  { value: "all", label: "All Countries" },
                  ...Object.entries(catalog?.countries || {}).map(([code, name]) => ({
                    value: code,
                    label: `${code} - ${name}`,
                  })),
                ]}
                onChange={setCountryFilter}
              />
              <FilterPill
                label="Status"
                value={statusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <SortPill
                value={sort}
                options={[
                  { value: "name", label: "Company name" },
                  { value: "created_at", label: "Date added" },
                ]}
                onChange={setSort}
              />
              <ViewSettingsButton />
            </div>
          </>
        }
      />

      {partners.length === 0 ? (
        <div className="p-8">
          <Empty
            title="No Partners Found"
            description="Add your first business partner or adjust your search and filters."
            action={
              can("partners.manage") ? (
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
          rowData={partners}
          columnDefs={columnDefs}
          title="Directory of Business Partners"
          quickFilterPlaceholder="Quick search partners..."
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
