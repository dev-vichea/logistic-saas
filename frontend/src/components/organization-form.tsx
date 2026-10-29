"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeading, NoOrganization, ErrorBox } from "@/components/common";
export function OrganizationForm({ create = false }: { create?: boolean }) {
  const { organization: org, catalog, refresh, can, notify } = useWorkspace();
  const router = useRouter();
  const [activities, setActivities] = useState<string[]>(
    create ? ["road_transport"] : org?.activities || [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!create && !org) return <NoOrganization />;
  const editable = create || can("organization.update");
  const values = create ? null : org;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.request({
        method: create ? "POST" : "PATCH",
        url: create
          ? "/api/v1/organizations"
          : `/api/v1/organizations/${org!.id}`,
        data: { ...form, activities },
      });
      await refresh();
      notify(
        create
          ? "Organization created. Welcome to your workspace."
          : "Company profile updated.",
      );
      if (create) router.push("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const field = (
    name: string,
    label: string,
    placeholder: string,
    type = "text",
    required = false,
  ) => (
    <div className="space-y-2" key={name}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={String(values?.[name as keyof typeof values] || "")}
        maxLength={
          name === "name"
            ? 160
            : name === "legal_name"
              ? 200
              : name === "phone"
                ? 40
                : ["registration_number", "tax_number"].includes(name)
                  ? 80
                  : name === "city"
                    ? 100
                    : 254
        }
      />
    </div>
  );
  return (
    <>
      <Link
        href="/organizations"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft size={14} />
        All organizations
      </Link>
      <PageHeading
        eyebrow="ORGANIZATION SETTINGS"
        title={create ? "Create an organization" : "Company profile"}
        description={
          create
            ? "Give your business a home. You can invite your team next."
            : "Keep your company information and business activities up to date."
        }
      />
      <ErrorBox message={error} />
      {!editable && (
        <p className="mb-5 rounded-xl border bg-white p-4 text-sm text-muted-foreground">
          You can view this profile. An owner or administrator can make changes.
        </p>
      )}
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={!editable || busy} className="space-y-6">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Company information</h2>
                <p>The details that identify your business.</p>
              </div>
              <span className="step-number">01</span>
            </div>
            <div className="grid gap-5 p-6 pt-0 sm:grid-cols-2">
              {field(
                "name",
                "Organization name",
                "e.g. Mekong Express",
                "text",
                true,
              )}
              {field(
                "legal_name",
                "Legal company name",
                "Registered company name",
              )}
              {field(
                "registration_number",
                "Registration number",
                "Business registration number",
              )}
              {field("tax_number", "Tax identification number", "Tax number")}
              {field("email", "Company email", "hello@company.com", "email")}
              {field("phone", "Phone number", "+855 23 000 000")}
              {field("website", "Website", "https://company.com", "url")}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Location & preferences</h2>
                <p>Local context for your regional operations.</p>
              </div>
              <span className="step-number">02</span>
            </div>
            <div className="grid gap-5 p-6 pt-0 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country_code">Country *</Label>
                <select
                  id="country_code"
                  name="country_code"
                  className="select-input"
                  defaultValue={values?.country_code || "KH"}
                >
                  {Object.entries(catalog.countries).map(([code, name]) => (
                    <option value={code} key={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {field("city", "City / province", "Phnom Penh")}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Business address</Label>
                <textarea
                  className="select-input min-h-20 resize-y"
                  id="address"
                  name="address"
                  maxLength={500}
                  defaultValue={values?.address || ""}
                  placeholder="Street, district, province"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <select
                  id="timezone"
                  name="timezone"
                  className="select-input"
                  defaultValue={values?.timezone || "Asia/Phnom_Penh"}
                >
                  {Array.from(
                    new Set([
                      values?.timezone || "Asia/Phnom_Penh",
                      "Asia/Phnom_Penh",
                      "Asia/Bangkok",
                      "Asia/Ho_Chi_Minh",
                      "Asia/Vientiane",
                      "Asia/Yangon",
                      "Asia/Kuala_Lumpur",
                      "Asia/Singapore",
                      "Asia/Jakarta",
                      "Asia/Manila",
                      "Asia/Brunei",
                      "Asia/Dili",
                    ]),
                  ).map((t) => (
                    <option value={t} key={t}>
                      {t.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Default currency *</Label>
                <select
                  id="currency"
                  name="currency"
                  className="select-input"
                  defaultValue={values?.currency || "USD"}
                >
                  {catalog.currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Business activities</h2>
                <p>Select all the logistics services your company provides.</p>
              </div>
              <span className="step-number">03</span>
            </div>
            <div className="grid gap-3 p-6 pt-0 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(catalog.activities).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-xs transition-colors ${activities.includes(value) ? "border-primary/40 bg-blue-50/60 text-primary" : "text-muted-foreground"}`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={activities.includes(value)}
                    onChange={(e) =>
                      setActivities(
                        e.target.checked
                          ? [...activities, value]
                          : activities.filter((a) => a !== value),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        </fieldset>
        {editable && (
          <div className="flex items-center justify-end gap-4">
            <p className="text-xs text-muted-foreground">* Required fields</p>
            <Button type="submit" disabled={busy || !activities.length}>
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Check size={16} />
              )}{" "}
              {create ? "Create organization" : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
