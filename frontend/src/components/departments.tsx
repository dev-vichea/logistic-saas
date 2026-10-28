"use client";
import { useState, type FormEvent } from "react";
import { Plus, Network, Pencil, Trash2, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { useResource } from "@/lib/use-resource";
import { api, errorMessage } from "@/lib/api";
import type { Department, Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
  Empty,
  Pagination,
} from "@/components/common";
export function Departments() {
  const { organization: org, can, notify } = useWorkspace();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = org ? `/api/v1/organizations/${org.id}/departments` : null;
  const {
    data,
    error: loadError,
    reload,
  } = useResource<Paginated<Department>>(url ? `${url}?page=${page}` : null);
  if (!org) return <NoOrganization />;
  const manage = can("departments.manage");
  function close() {
    setOpen(false);
    setEditing(null);
    setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.request({
        method: editing ? "PATCH" : "POST",
        url: editing ? `${url}/${editing.id}` : url!,
        data: Object.fromEntries(new FormData(event.currentTarget)),
      });
      reload();
      notify(editing ? "Department updated." : "Department created.");
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(d: Department) {
    if (
      !window.confirm(
        `Delete ${d.name}? Members and invitations will be unassigned from this department.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api.delete(`${url}/${d.id}`);
      reload();
      notify("Department deleted.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const action = manage ? (
    <Button
      onClick={() => {
        setOpen(true);
        setError("");
      }}
    >
      <Plus size={16} />
      Add department
    </Button>
  ) : undefined;
  return (
    <>
      <PageHeading
        eyebrow="ORGANIZE YOUR PEOPLE"
        title="Departments"
        description="Create a clear home for every team in your organization."
        action={action}
      />
      {!open && <ErrorBox message={error || loadError} />}
      {!data ? (
        <Loading />
      ) : !data.data.length ? (
        <Empty
          title="A place for every team"
          description="Group your people into departments such as Operations, Finance or Customer Service."
          action={action}
        />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.data.map((d) => (
              <section key={d.id} className="panel p-6">
                <div className="flex justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-primary">
                    <Network size={20} />
                  </div>
                  {manage && (
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${d.name}`}
                        onClick={() => {
                          setEditing(d);
                          setOpen(true);
                          setError("");
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${d.name}`}
                        disabled={busy}
                        onClick={() => remove(d)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                <h2 className="mt-5 text-base font-semibold">{d.name}</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {d.description || "Ready to bring your people together."}
                </p>
              </section>
            ))}
          </div>
          <Pagination page={page} last={data.last_page} onChange={setPage} />
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit department" : "Create a department"}
            </DialogTitle>
            <DialogDescription>
              Organize people around the work they do.
            </DialogDescription>
          </DialogHeader>
          <ErrorBox message={error} />
          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="department-name">Department name</Label>
              <Input
                id="department-name"
                name="name"
                defaultValue={editing?.name || ""}
                placeholder="e.g. Operations"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="select-input min-h-24"
                defaultValue={editing?.description || ""}
                maxLength={500}
                placeholder="What does this team do?"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                {editing ? "Save changes" : "Create department"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
