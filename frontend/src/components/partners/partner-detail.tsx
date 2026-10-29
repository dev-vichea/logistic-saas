"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Archive,
  RotateCcw,
  Building2,
  MapPin,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
  formatDate,
} from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { api, errorMessage } from "@/lib/api";
import { partnerRoot, type Partner, type PartnerCatalog } from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PartnerStatus } from "./fields";
import { PartnerRecords } from "./partner-records";
export function PartnerDetail({ id }: { id: string }) {
  const { organization, can, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = organization ? `${partnerRoot(organization.id)}/${id}` : null;
  const resource = useResource<{ data: Partner }>(url);
  const catalog = useResource<{ data: PartnerCatalog }>(
    organization ? `${partnerRoot(organization.id)}/catalog` : null,
  );
  if (!organization) return <NoOrganization />;
  if (resource.error || catalog.error)
    return <ErrorBox message={resource.error || catalog.error} />;
  if (!resource.data || !catalog.data) return <Loading />;
  const partner = resource.data.data;
  const labels = catalog.data.data;
  const archived = !!partner.archived_at;
  async function archive() {
    if (
      !window.confirm(
        archived
          ? "Restore this partner and allow changes again?"
          : "Archive this partner? Its profile, contacts and locations will be retained and become read-only.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.post(`${url}/${archived ? "restore" : "archive"}`);
      resource.reload();
      notify(archived ? "Partner restored." : "Partner archived.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href="/partners"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft size={14} />
        All business partners
      </Link>
      <PageHeading
        eyebrow="PARTNER PROFILE"
        title={partner.name}
        description={
          partner.legal_name ||
          "A business relationship in your private directory."
        }
        action={
          <div className="flex gap-2">
            {can("partners.archive") && (
              <Button variant="outline" disabled={busy} onClick={archive}>
                {archived ? <RotateCcw size={15} /> : <Archive size={15} />}
                {archived ? "Restore partner" : "Archive partner"}
              </Button>
            )}
            {can("partners.manage") && !archived && (
              <Button asChild>
                <Link href={`/partners/${partner.id}/edit`}>
                  <Pencil size={15} />
                  Edit partner
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <ErrorBox message={error} />
      {archived && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
          Archived on {formatDate(partner.archived_at!, organization.timezone)}.
          Contacts and locations are preserved. Restore this partner before
          making changes.
        </div>
      )}
      <section className="panel mb-6 flex flex-wrap items-center justify-between gap-5 p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-primary">
            <Building2 size={26} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">
                {partner.code || "Company profile"}
              </span>
              <PartnerStatus archived={archived} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {labels.countries[partner.country_code]}
            </p>
          </div>
        </div>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <a href="#contacts" className="flex items-center gap-2">
            <Users size={16} />
            {partner.contacts_count}{" "}
            {partner.contacts_count === 1 ? "contact" : "contacts"}
          </a>
          <a href="#locations" className="flex items-center gap-2">
            <MapPin size={16} />
            {partner.locations_count}{" "}
            {partner.locations_count === 1 ? "location" : "locations"}
          </a>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Company information</h2>
              <p>Core details for your business relationship.</p>
            </div>
          </div>
          <dl className="grid gap-5 px-6 pb-6 sm:grid-cols-2">
            {[
              ["Legal name", partner.legal_name],
              ["Reference code", partner.code],
              ["Registration number", partner.registration_number],
              ["Tax identifier", partner.tax_number],
              ["Company email", partner.email],
              ["Phone", partner.phone],
              ["Website", partner.website],
              ["Country", labels.countries[partner.country_code]],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] text-muted-foreground">{label}</dt>
                <dd className="mt-1.5 break-all text-xs leading-6">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel p-6">
          <h2 className="text-[13px] font-semibold">Business roles</h2>
          <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
            The ways your organization works with this partner.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {partner.roles.map((role) => (
              <Badge variant="secondary" key={role}>
                {labels.roles[role]}
              </Badge>
            ))}
          </div>
          <div className="mt-7 flex gap-3 border-t pt-5">
            <ShieldCheck size={18} className="shrink-0 text-primary" />
            <p className="text-[11px] leading-6 text-muted-foreground">
              Private to {organization.name}. This record does not grant the
              partner access to your workspace.
            </p>
          </div>
        </section>
      </div>
      {partner.notes && (
        <section className="panel mt-6 p-6">
          <h2 className="text-[13px] font-semibold">Operational notes</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-7 text-muted-foreground">
            {partner.notes}
          </p>
        </section>
      )}
      <PartnerRecords
        partner={partner}
        catalog={labels}
        kind="contacts"
        onChange={resource.reload}
      />
      <PartnerRecords
        partner={partner}
        catalog={labels}
        kind="locations"
        onChange={resource.reload}
      />
      <p className="mt-6 text-[10px] text-muted-foreground">
        Added {formatDate(partner.created_at, organization.timezone)} · Updated{" "}
        {formatDate(partner.updated_at, organization.timezone)}
      </p>
    </>
  );
}
