"use client";
import { useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Mail,
  Phone,
  MapPin,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { Loading, ErrorBox, Pagination } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { api, errorMessage } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import {
  partnerRoot,
  type Partner,
  type PartnerContact,
  type PartnerLocation,
  type PartnerCatalog,
} from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, CountryField, NotesField } from "./fields";
type RecordType = PartnerContact | PartnerLocation;
export function PartnerRecords({
  partner,
  catalog,
  kind,
  onChange,
}: {
  partner: Partner;
  catalog: PartnerCatalog;
  kind: "contacts" | "locations";
  onChange: () => void;
}) {
  const { organization, can, notify } = useWorkspace();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = `${partnerRoot(organization!.id)}/${partner.id}/${kind}`;
  const {
    data,
    error: loadError,
    reload,
  } = useResource<Paginated<RecordType>>(`${url}?page=${page}`);
  const editable = can("partners.manage") && !partner.archived_at;
  const locations = kind === "locations";
  const noun = locations ? "location" : "contact";
  const location = editing && "address_line_1" in editing ? editing : null;
  const contact = editing && "email" in editing ? editing : null;
  function close() {
    setOpen(false);
    setEditing(null);
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const values = {
      ...form,
      is_primary: form.is_primary === "on",
      ...(locations
        ? {
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null,
          }
        : {}),
    };
    try {
      await api.request({
        method: editing ? "PATCH" : "POST",
        url: editing ? `${url}/${editing.id}` : url,
        data: values,
      });
      reload();
      onChange();
      notify(
        `${locations ? "Location" : "Contact"} ${editing ? "updated" : "added"}.`,
      );
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(record: RecordType) {
    if (
      !window.confirm(
        `Delete ${record.name}? This ${noun} will be removed from the partner profile.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`${url}/${record.id}`);
      if (data?.data.length === 1 && page > 1) setPage(page - 1);
      else reload();
      onChange();
      notify(`${locations ? "Location" : "Contact"} deleted.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel mt-6" id={kind}>
      <div className="panel-heading">
        <div>
          <h2>{locations ? "Addresses & locations" : "People & contacts"}</h2>
          <p>
            {locations
              ? "Business sites and addresses for this partner."
              : "Reach the right person at the right time."}
          </p>
        </div>
        {editable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            <Plus size={14} />
            Add {noun}
          </Button>
        )}
      </div>
      <div className="px-6 pb-6">
        {!open && <ErrorBox message={error || loadError} />}
        {!data && !loadError ? (
          <Loading />
        ) : data && !data.data.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
            No {kind} yet.{" "}
            {editable
              ? `Add a ${noun} to complete this profile.`
              : "This partner has no records in this section."}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data?.data.map((record) => (
              <article key={record.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                      {locations ? (
                        <MapPin size={16} />
                      ) : (
                        <UserRound size={16} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="break-words text-xs font-semibold">
                        {record.name}
                      </h3>
                      {record.is_primary && (
                        <Badge className="mt-1 text-[9px]" variant="secondary">
                          Primary {noun}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {editable && (
                    <div className="flex shrink-0">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Edit ${record.name}`}
                        onClick={() => {
                          setEditing(record);
                          setOpen(true);
                          setError("");
                        }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Delete ${record.name}`}
                        onClick={() => remove(record)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>
                {"address_line_1" in record ? (
                  <div className="mt-4 space-y-2 text-xs leading-6 text-muted-foreground">
                    <p className="text-[10px] font-medium text-primary">
                      {catalog.location_types[record.type]}
                    </p>
                    <p>
                      {record.address_line_1}
                      {record.address_line_2 && (
                        <>
                          <br />
                          {record.address_line_2}
                        </>
                      )}
                      <br />
                      {[record.city, record.state, record.postal_code]
                        .filter(Boolean)
                        .join(", ")}
                      <br />
                      {catalog.countries[record.country_code]}
                    </p>
                    {record.latitude !== null && (
                      <p className="font-mono text-[10px]">
                        {record.latitude}, {record.longitude}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {record.job_title && <p>{record.job_title}</p>}
                    {record.email && (
                      <p className="flex items-start gap-2 break-all">
                        <Mail size={13} className="mt-0.5 shrink-0" />
                        {record.email}
                      </p>
                    )}
                    {record.phone && (
                      <p className="flex items-center gap-2">
                        <Phone size={13} />
                        {record.phone}
                      </p>
                    )}
                  </div>
                )}
                {record.notes && (
                  <p className="mt-3 whitespace-pre-wrap break-words border-t pt-3 text-[11px] leading-6 text-muted-foreground">
                    {record.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
        {data && (
          <Pagination page={page} last={data.last_page} onChange={setPage} />
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Add"} {noun}
            </DialogTitle>
            <DialogDescription>
              {locations
                ? "Save a reusable business location with its own address and optional coordinates."
                : "Keep a person’s business contact details with this partner."}
            </DialogDescription>
          </DialogHeader>
          <ErrorBox message={error} />
          <form onSubmit={submit} className="space-y-5">
            <fieldset disabled={busy} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="name"
                  label={locations ? "Location name" : "Contact name"}
                  required
                  max={160}
                  value={editing?.name}
                />
                {locations ? (
                  <div className="space-y-2">
                    <Label htmlFor="type">Location type *</Label>
                    <select
                      id="type"
                      name="type"
                      className="select-input"
                      defaultValue={location?.type || "office"}
                    >
                      {Object.entries(catalog.location_types).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                ) : (
                  <Field
                    name="job_title"
                    label="Job title"
                    max={100}
                    value={contact?.job_title}
                  />
                )}
              </div>
              {locations ? (
                <>
                  <Field
                    name="address_line_1"
                    label="Address line 1"
                    required
                    value={location?.address_line_1}
                  />
                  <Field
                    name="address_line_2"
                    label="Address line 2"
                    value={location?.address_line_2}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name="city"
                      label="City"
                      required
                      max={100}
                      value={location?.city}
                    />
                    <Field
                      name="state"
                      label="State / province"
                      max={100}
                      value={location?.state}
                    />
                    <Field
                      name="postal_code"
                      label="Postal code"
                      max={20}
                      value={location?.postal_code}
                    />
                    <CountryField
                      countries={catalog.countries}
                      value={location?.country_code || partner.country_code}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <input
                        id="latitude"
                        name="latitude"
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        defaultValue={location?.latitude ?? ""}
                        className="select-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <input
                        id="longitude"
                        name="longitude"
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        defaultValue={location?.longitude ?? ""}
                        className="select-input"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Enter both coordinates or leave both empty.
                  </p>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name="email"
                    label="Contact email"
                    type="email"
                    max={254}
                    value={contact?.email}
                  />
                  <Field
                    name="phone"
                    label="Contact phone"
                    max={40}
                    value={contact?.phone}
                  />
                </div>
              )}
              <NotesField value={editing?.notes} max={2000} label="Notes" />
              <label className="flex items-start gap-3 text-xs">
                <input
                  type="checkbox"
                  name="is_primary"
                  className="mt-0.5 accent-emerald-700"
                  defaultChecked={editing?.is_primary ?? false}
                />
                <span>
                  Set as primary {noun}
                  <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                    This replaces the current primary {noun}, if one is set.
                  </span>
                </span>
              </label>
            </fieldset>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}Save{" "}
                {noun}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
