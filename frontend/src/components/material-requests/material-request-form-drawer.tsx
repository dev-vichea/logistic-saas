"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import {
  materialRequestsRoot,
  type MaterialRequest,
} from "@/lib/material-requests";
import { ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type DraftItem = {
  key: string;
  id?: number;
  description: string;
  specification: string;
  quantity: string;
  unit: string;
};

type Draft = {
  title: string;
  neededBy: string;
  notes: string;
  items: DraftItem[];
};

function formFor(request?: MaterialRequest): Draft {
  return {
    title: request?.title ?? "",
    neededBy: request?.needed_by?.slice(0, 10) ?? "",
    notes: request?.notes ?? "",
    items: request?.items?.map((item) => ({
      key: `item-${item.id}`,
      id: item.id,
      description: item.description,
      specification: item.specification ?? "",
      quantity: String(item.quantity),
      unit: item.unit,
    })) ?? [{ key: "new-0", description: "", specification: "", quantity: "", unit: "" }],
  };
}

export function MaterialRequestFormDrawer({
  request,
  onSaved,
}: {
  request?: MaterialRequest;
  onSaved: () => void;
}) {
  const { organization, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Draft>(() => formFor(request));

  function changeItem(key: string, field: keyof Omit<DraftItem, "key" | "id">, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, [field]: value } : item),
    }));
  }

  function changeOpen(next: boolean) {
    if (next) {
      setForm(formFor(request));
      setError("");
    }
    setOpen(next);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    setSaving(true);
    setError("");
    const payload = {
      title: form.title.trim(),
      needed_by: form.neededBy || null,
      notes: form.notes.trim() || null,
      items: form.items.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        description: item.description.trim(),
        specification: item.specification.trim() || null,
        quantity: Number(item.quantity),
        unit: item.unit.trim().toUpperCase(),
      })),
    };
    try {
      const root = materialRequestsRoot(organization.id);
      if (request) {
        await api.patch(`${root}/${request.id}`, payload);
      } else {
        await api.post(root, payload);
      }
      setOpen(false);
      onSaved();
      notify(request ? "Material request updated." : "Material request saved.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button variant={request ? "outline" : "default"}>
          {request ? <Pencil size={15} /> : <Plus size={15} />}
          {request ? "Edit request" : "New material request"}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="xl" className="p-0">
        <form onSubmit={save} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{request ? "Edit material request" : "New material request"}</SheetTitle>
            <SheetDescription>List the materials and quantities your team needs.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-6">
            <ErrorBox message={error} />
            <div className="space-y-2">
              <Label htmlFor="material-request-title">Request title</Label>
              <Input
                id="material-request-title"
                required
                maxLength={200}
                placeholder="e.g. Fabric for November production"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-request-needed-by">Needed by</Label>
              <Input
                id="material-request-needed-by"
                type="date"
                value={form.neededBy}
                onChange={(event) => setForm({ ...form, neededBy: event.target.value })}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Materials</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={form.items.length >= 100}
                  onClick={() => setForm((current) => ({
                    ...current,
                    items: [...current.items, {
                      key: crypto.randomUUID(), description: "", specification: "", quantity: "", unit: "",
                    }],
                  }))}
                >
                  <Plus size={14} /> Add material
                </Button>
              </div>
              {form.items.map((item, index) => (
                <div key={item.key} className="panel space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Material {index + 1}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove material ${index + 1}`}
                      disabled={form.items.length === 1}
                      onClick={() => setForm((current) => ({
                        ...current,
                        items: current.items.filter((row) => row.key !== item.key),
                      }))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`description-${item.key}`}>Description</Label>
                    <Input
                      id={`description-${item.key}`}
                      required
                      maxLength={250}
                      value={item.description}
                      onChange={(event) => changeItem(item.key, "description", event.target.value)}
                      placeholder="e.g. Cotton fabric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`specification-${item.key}`}>Specification</Label>
                    <Input
                      id={`specification-${item.key}`}
                      maxLength={250}
                      value={item.specification}
                      onChange={(event) => changeItem(item.key, "specification", event.target.value)}
                      placeholder="Colour, width, grade, or size"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${item.key}`}>Quantity</Label>
                      <Input
                        id={`quantity-${item.key}`}
                        type="number"
                        required
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(event) => changeItem(item.key, "quantity", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`unit-${item.key}`}>Unit</Label>
                      <Input
                        id={`unit-${item.key}`}
                        required
                        maxLength={20}
                        value={item.unit}
                        onChange={(event) => changeItem(item.key, "unit", event.target.value)}
                        placeholder="METER, PCS, KG"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-request-notes">Notes</Label>
              <Textarea
                id="material-request-notes"
                maxLength={5000}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : request ? "Save changes" : "Save request"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
