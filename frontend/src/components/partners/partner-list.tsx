"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { type FormEvent, useTransition } from "react";
import {
  Plus,
  Search,
  ShieldCheck,
  ArrowUpRight,
  Users,
  MapPin,
  Building2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
  Empty,
  Pagination,
} from "@/components/common";
import { useResource } from "@/lib/use-resource";
import {
  partnerRoot,
  type PartnerPage,
  type PartnerCatalog,
} from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PartnerStatus } from "./fields";
export function PartnerList({
  contactsMode = false,
}: {
  contactsMode?: boolean;
}) {
  const { organization, can } = useWorkspace();
  const router = useRouter();
  const routeBase = usePathname();
  const query = useSearchParams();
  const [pending, startTransition] = useTransition();
  const catalog = useResource<{ data: PartnerCatalog }>(
    organization ? `${partnerRoot(organization.id)}/catalog` : null,
  );
  if (!organization) return <NoOrganization />;
  if (catalog.error) return <ErrorBox message={catalog.error} />;
  if (!catalog.data) return <Loading />;
  const data = catalog.data.data;
  const change = (values: Record<string, string>) => {
    const params = new URLSearchParams(query.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() =>
      router.push(routeBase + "?" + params.toString(), { scroll: false }),
    );
  };
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    change({
      q: String(new FormData(event.currentTarget).get("q") || "").trim(),
    });
  }
  const add = can("partners.manage") ? (
    <Button asChild>
      <Link href="/partners/new">
        <Plus size={16} />
        Add partner
      </Link>
    </Button>
  ) : undefined;
  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS NETWORK"
        title={contactsMode ? "Contacts & locations" : "Business partners"}
        description={
          contactsMode
            ? "Find people and business sites. Open a partner profile to manage its contacts and locations."
            : "The customers, companies and people you move business with."
        }
        action={add}
      />
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
        <ShieldCheck size={19} className="shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium">Private to {organization.name}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Your partner directory belongs to this organization. Partners do not
            need a Mekong account, and their details are never shared
            automatically.
          </p>
        </div>
      </div>
      <section className="panel mb-5 p-5">
        <fieldset disabled={pending} className="min-w-0" aria-busy={pending}>
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-2 text-muted-foreground"
              />
              <Input
                key={query.get("q") || ""}
                name="q"
                aria-label="Search partners"
                placeholder="Search company, code, contact or location…"
                className="pl-9"
                defaultValue={query.get("q") || ""}
                maxLength={120}
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Filter
              label="Business role"
              value={query.get("role") || ""}
              onChange={(value) => change({ role: value })}
              options={{ "": "All roles", ...data.roles }}
            />
            <Filter
              label="Country"
              value={query.get("country_code") || ""}
              onChange={(value) => change({ country_code: value })}
              options={{ "": "All countries", ...data.countries }}
            />
            <Filter
              label="Status"
              value={query.get("status") || "active"}
              onChange={(value) => change({ status: value })}
              options={{
                active: "Active partners",
                archived: "Archived partners",
                all: "All partners",
              }}
            />
            <Filter
              label="Sort by"
              value={query.get("sort") || "name"}
              onChange={(value) => change({ sort: value })}
              options={{
                name: "Company name",
                code: "Reference code",
                country_code: "Country code",
                created_at: "Date added",
                updated_at: "Last updated",
              }}
            />
            <Filter
              label="Sort direction"
              value={query.get("direction") || "asc"}
              onChange={(value) => change({ direction: value })}
              options={{ asc: "Ascending", desc: "Descending" }}
            />
            <Filter
              label="Rows per page"
              value={query.get("per_page") || "20"}
              onChange={(value) => change({ per_page: value })}
              options={{
                20: "20 per page",
                50: "50 per page",
                100: "100 per page",
              }}
            />
          </div>
          {query.toString() && (
            <button
              onClick={() => startTransition(() => router.push(routeBase))}
              className="mt-4 text-xs font-medium text-primary"
            >
              Clear search & filters
            </button>
          )}
        </fieldset>
      </section>
      <PartnerResults
        key={query.toString()}
        url={`${partnerRoot(organization.id)}?${query.toString()}`}
        catalog={data}
        contactsMode={contactsMode}
        onPage={(page) => {
          const params = new URLSearchParams(query.toString());
          params.set("page", String(page));
          router.push(routeBase + "?" + params.toString(), { scroll: false });
        }}
      />
    </>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        className="select-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
function PartnerResults({
  url,
  catalog,
  onPage,
  contactsMode = false,
}: {
  url: string;
  catalog: PartnerCatalog;
  onPage: (page: number) => void;
  contactsMode?: boolean;
}) {
  const { data, error } = useResource<PartnerPage>(url);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  if (!data.data.length)
    return (
      <Empty
        title="No partners found"
        description="Add your first business partner or adjust your search and filters."
        action={
          data.current_page > 1 ? (
            <Button variant="outline" onClick={() => onPage(1)}>
              Back to first page
            </Button>
          ) : undefined
        }
      />
    );
  return (
    <>
      <div className="mb-3 text-xs text-muted-foreground">
        {data.total} {data.total === 1 ? "partner" : "partners"} in this view
      </div>
      <section className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Business roles</th>
              <th>Country</th>
              <th>Contact details</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Open profile</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((partner) => (
              <tr key={partner.id}>
                <td className="min-w-52">
                  <Link
                    href={`/partners/${partner.id}`}
                    aria-label={partner.name}
                    className="flex items-center gap-3 group"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary">
                      <Building2 size={18} />
                    </span>
                    <span>
                      <span className="block font-semibold group-hover:text-primary">
                        {partner.name}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {partner.code ||
                          partner.legal_name ||
                          "Company profile"}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="min-w-40">
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {partner.roles.map((role) => (
                      <Badge
                        variant="secondary"
                        key={role}
                        className="text-[9px] font-normal"
                      >
                        {catalog.roles[role]}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap text-muted-foreground">
                  {catalog.countries[partner.country_code]}
                </td>
                <td className="min-w-40">
                  <span className="block text-[11px]">
                    {partner.email || partner.phone || "—"}
                  </span>
                  <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                    <Link
                      href={`/partners/${partner.id}#contacts`}
                      aria-label={`Open contacts for ${partner.name}`}
                      className="flex gap-1 hover:text-primary"
                    >
                      <Users size={12} />
                      {partner.contacts_count}
                      {contactsMode && " contacts"}
                    </Link>
                    <Link
                      href={`/partners/${partner.id}#locations`}
                      aria-label={`Open locations for ${partner.name}`}
                      className="flex gap-1 hover:text-primary"
                    >
                      <MapPin size={12} />
                      {partner.locations_count}
                      {contactsMode && " locations"}
                    </Link>
                  </div>
                </td>
                <td>
                  <PartnerStatus archived={!!partner.archived_at} />
                </td>
                <td>
                  <Link
                    href={`/partners/${partner.id}`}
                    aria-label={`View ${partner.name}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Pagination
        page={data.current_page}
        last={data.last_page}
        onChange={onPage}
      />
    </>
  );
}
