"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
} from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { api, errorMessage } from "@/lib/api";
import { partnerRoot, type Partner, type PartnerCatalog } from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { Field, CountryField, NotesField } from "./fields";
export function PartnerEditor({ id }: { id?: string }) {
  const { organization, can } = useWorkspace();
  const catalog = useResource<{ data: PartnerCatalog }>(
    organization ? `${partnerRoot(organization.id)}/catalog` : null,
  );
  const partner = useResource<{ data: Partner }>(
    organization && id ? `${partnerRoot(organization.id)}/${id}` : null,
  );
  if (!organization) return <NoOrganization />;
  if (!can("partners.manage"))
    return (
      <ErrorBox message="You can view partners, but your role cannot edit them." />
    );
  if (catalog.error || partner.error)
    return <ErrorBox message={catalog.error || partner.error} />;
  if (!catalog.data || (id && !partner.data)) return <Loading />;
  if (partner.data?.data.archived_at)
    return (
      <ErrorBox message="Restore this archived partner before making changes." />
    );
  return (
    <PartnerForm
      key={id || "new"}
      initial={partner.data?.data}
      catalog={catalog.data.data}
    />
  );
}
function PartnerForm({
  initial,
  catalog,
}: {
  initial?: Partner;
  catalog: PartnerCatalog;
}) {
  const { organization, notify } = useWorkspace();
  const router = useRouter();
  const [roles, setRoles] = useState(initial?.roles || ["customer"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.request<{ data: Partner }>({
        method: initial ? "PATCH" : "POST",
        url: `${partnerRoot(organization!.id)}${initial ? `/${initial.id}` : ""}`,
        data: {
          ...Object.fromEntries(new FormData(event.currentTarget)),
          roles,
        },
      });
      notify(
        initial ? "Partner profile updated." : "Business partner created.",
      );
      router.push(`/partners/${data.data.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href={initial ? `/partners/${initial.id}` : "/partners"}
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft size={14} />
        {initial ? "Back to partner" : "All business partners"}
      </Link>
      <PageHeading
        eyebrow="BUSINESS PARTNER DIRECTORY"
        title={initial ? "Edit partner" : "Add a business partner"}
        description="Create a private company profile. Add contacts and locations after saving."
      />
      <ErrorBox message={error} />
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={busy} className="space-y-6">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Company profile</h2>
                <p>The company details your team needs.</p>
              </div>
              <span className="step-number">01</span>
            </div>
            <div className="grid gap-5 p-6 pt-0 md:grid-cols-2">
              <Field
                name="name"
                label="Company name"
                required
                max={200}
                value={initial?.name}
                placeholder="e.g. Angkor Trading Co."
              />
              <Field
                name="legal_name"
                label="Legal company name"
                max={250}
                value={initial?.legal_name}
              />
              <Field
                name="code"
                label="Reference code"
                max={40}
                value={initial?.code}
                placeholder="e.g. KH-0001"
              />
              <CountryField
                countries={catalog.countries}
                value={initial?.country_code || "KH"}
              />
              <Field
                name="registration_number"
                label="Registration number"
                max={80}
                value={initial?.registration_number}
              />
              <Field
                name="tax_number"
                label="Tax identifier"
                max={80}
                value={initial?.tax_number}
              />
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Business roles</h2>
                <p>A company can play several roles. Select at least one.</p>
              </div>
              <span className="step-number">02</span>
            </div>
            <div className="grid gap-3 p-6 pt-0 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(catalog.roles).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-xs ${roles.includes(value) ? "border-primary/40 bg-emerald-50/60 text-primary" : "text-muted-foreground"}`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-emerald-700"
                    checked={roles.includes(value)}
                    onChange={(e) =>
                      setRoles(
                        e.target.checked
                          ? [...roles, value]
                          : roles.filter((role) => role !== value),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Contact details</h2>
                <p>General contact information for this business.</p>
              </div>
              <span className="step-number">03</span>
            </div>
            <div className="grid gap-5 p-6 pt-0 md:grid-cols-2">
              <Field
                name="email"
                label="Company email"
                type="email"
                max={254}
                value={initial?.email}
              />
              <Field
                name="phone"
                label="Company phone"
                max={40}
                value={initial?.phone}
              />
              <Field
                name="website"
                label="Website"
                max={255}
                type="url"
                value={initial?.website}
                placeholder="https://company.com"
              />
            </div>
          </section>
          <section className="panel p-6">
            <NotesField value={initial?.notes} />
          </section>
        </fieldset>
        <div className="flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link href={initial ? `/partners/${initial.id}` : "/partners"}>
              Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={busy || !roles.length}>
            {busy ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Check size={16} />
            )}{" "}
            {initial ? "Save partner" : "Create partner"}
          </Button>
        </div>
      </form>
    </>
  );
}
