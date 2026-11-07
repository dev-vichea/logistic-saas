"use client";

import React, { useState } from "react";
import {
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WorkspaceCard } from "@/components/workspace-drawer";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const dialogTitle = request ? "Edit material request" : "New material request";

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button variant={request ? "outline" : "default"}>
          {request ? <Pencil size={15} /> : <Plus size={15} />}
          {request ? "Edit request" : "New material request"}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        size={isFullscreen ? "full" : "4/5"}
        className="flex flex-col gap-0 border-l border-slate-200 p-0 overflow-hidden shadow-2xl transition-all duration-300 bg-[#F5F6F8]"
        showCloseButton={false}
        aria-label={dialogTitle}
      >
        <form onSubmit={save} className="flex h-full flex-col">
          {/* Top Header Drafts & Action Bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 select-none">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-3">
              <div className="flex h-10 min-w-44 items-center rounded-t-lg border border-b-0 border-slate-200 border-t-2 border-t-blue-600 bg-white px-3 font-semibold text-blue-950 shadow-2xs">
                <span className="size-2 shrink-0 rounded-xs bg-blue-600 mr-2" />
                <span className="truncate text-xs font-semibold">{dialogTitle}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pl-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 gap-1.5 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                title={isFullscreen ? "Switch to 4/5 drawer" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">
                  {isFullscreen ? "Standard 4/5" : "Fullscreen"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="h-8 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="h-8 gap-1 px-3.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
              >
                {saving ? "Saving…" : request ? "Save changes" : "Save request"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
                className="size-8 p-0 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={15} />
              </Button>
            </div>
          </div>

          <SheetTitle className="sr-only">{dialogTitle}</SheetTitle>
          <SheetDescription className="sr-only">List the materials and quantities your team needs.</SheetDescription>

          {/* Form Body with Cards */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-3.5">
            <ErrorBox message={error} />

            {/* Card 1: Request Details */}
            <WorkspaceCard
              icon={Layers}
              iconBg="bg-blue-50 text-blue-600"
              title="Request Information"
              subtitle="Material demand description and schedule deadline"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="material-request-title" className="text-[11px] font-medium text-slate-600">
                    Request title
                  </Label>
                  <Input
                    id="material-request-title"
                    required
                    maxLength={200}
                    placeholder="e.g. Fabric for November production"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className="mt-1 h-[38px] bg-white text-xs font-normal"
                  />
                </div>
                <div>
                  <Label htmlFor="material-request-needed-by" className="text-[11px] font-medium text-slate-600">
                    Needed by
                  </Label>
                  <Input
                    id="material-request-needed-by"
                    type="date"
                    value={form.neededBy}
                    onChange={(event) => setForm({ ...form, neededBy: event.target.value })}
                    className="mt-1 h-[38px] bg-white text-xs font-normal"
                  />
                </div>
              </div>
            </WorkspaceCard>

            {/* Card 2: Materials */}
            <WorkspaceCard
              icon={Plus}
              iconBg="bg-purple-50 text-purple-600"
              title="Materials Required"
              subtitle="Specify line items, specifications, and target quantities"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={form.items.length >= 100}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        {
                          key: crypto.randomUUID(),
                          description: "",
                          specification: "",
                          quantity: "",
                          unit: "",
                        },
                      ],
                    }))
                  }
                  className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5"
                >
                  <Plus size={12} className="mr-1" /> Add material
                </Button>
              }
            >
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={item.key} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-semibold text-slate-800">Material Item #{index + 1}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove material ${index + 1}`}
                        disabled={form.items.length === 1}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            items: current.items.filter((row) => row.key !== item.key),
                          }))
                        }
                        className="size-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`description-${item.key}`} className="text-[11px] font-medium text-slate-600">
                          Description
                        </Label>
                        <Input
                          id={`description-${item.key}`}
                          required
                          maxLength={250}
                          value={item.description}
                          onChange={(event) => changeItem(item.key, "description", event.target.value)}
                          placeholder="e.g. Cotton fabric"
                          className="mt-1 h-[38px] bg-white text-xs font-normal"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`specification-${item.key}`} className="text-[11px] font-medium text-slate-600">
                          Specification
                        </Label>
                        <Input
                          id={`specification-${item.key}`}
                          maxLength={250}
                          value={item.specification}
                          onChange={(event) => changeItem(item.key, "specification", event.target.value)}
                          placeholder="Colour, width, grade, or size"
                          className="mt-1 h-[38px] bg-white text-xs font-normal"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`quantity-${item.key}`} className="text-[11px] font-medium text-slate-600">
                          Quantity
                        </Label>
                        <Input
                          id={`quantity-${item.key}`}
                          type="number"
                          required
                          min="0.001"
                          step="0.001"
                          value={item.quantity}
                          onChange={(event) => changeItem(item.key, "quantity", event.target.value)}
                          className="mt-1 h-[38px] bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`unit-${item.key}`} className="text-[11px] font-medium text-slate-600">
                          Unit
                        </Label>
                        <Input
                          id={`unit-${item.key}`}
                          required
                          maxLength={20}
                          value={item.unit}
                          onChange={(event) => changeItem(item.key, "unit", event.target.value)}
                          placeholder="METER, PCS, KG"
                          className="mt-1 h-[38px] bg-white text-xs font-mono uppercase placeholder:font-sans placeholder:normal-case"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </WorkspaceCard>

            {/* Card 3: Notes */}
            <WorkspaceCard
              icon={FileText}
              iconBg="bg-slate-100 text-slate-600"
              title="Operational Notes & Instructions"
            >
              <div>
                <Label htmlFor="material-request-notes" className="text-[11px] font-medium text-slate-600">
                  Notes
                </Label>
                <Textarea
                  id="material-request-notes"
                  maxLength={5000}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Special storage, handling, or supplier preference notes..."
                  className="mt-1 bg-white text-xs"
                />
              </div>
            </WorkspaceCard>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
