"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Mail,
  Users,
  Trash2,
  Pencil,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { useResource } from "@/lib/use-resource";
import { useDepartments } from "@/lib/use-departments";
import { api, errorMessage } from "@/lib/api";
import type { Member, Invitation, Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  PageHeading,
  NoOrganization,
  Loading,
  ErrorBox,
  Pagination,
  formatDate,
} from "@/components/common";
export function Team() {
  const {
    organization: org,
    user,
    can,
    catalog,
    refresh,
    notify,
  } = useWorkspace();
  const query = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState("members");
  const [page, setPage] = useState(1);
  const [invitePage, setInvitePage] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const manage = can("team.manage");
  const url = org ? `/api/v1/organizations/${org.id}` : null;
  const members = useResource<Paginated<Member>>(
    url ? `${url}/members?page=${page}` : null,
  );
  const invitations = useResource<Paginated<Invitation>>(
    url && manage ? `${url}/invitations?page=${invitePage}` : null,
  );
  const { departments, error: departmentsError } = useDepartments(org?.id);
  const inviteOpen = dialog || query.get("invite") === "1";
  if (!org) return <NoOrganization />;
  function close() {
    setDialog(false);
    setEditing(null);
    setError("");
    if (query.has("invite")) router.replace("/team");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.request({
        method: editing ? "PATCH" : "POST",
        url: editing ? `${url}/members/${editing.id}` : `${url}/invitations`,
        data: {
          ...form,
          ...(!editing
            ? {
                email: String(form.email || "")
                  .trim()
                  .toLowerCase(),
              }
            : {}),
          department_id: form.department_id ? Number(form.department_id) : null,
        },
      });
      members.reload();
      invitations.reload();
      await refresh();
      notify(
        editing
          ? "Member updated."
          : "Invitation sent. Your teammate will receive an email.",
      );
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(kind: "members" | "invitations", id: number) {
    if (
      !window.confirm(
        kind === "members"
          ? "Remove this member from the organization? They will immediately lose access."
          : "Revoke this invitation? The email link will stop working.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`${url}/${kind}/${id}`);
      members.reload();
      invitations.reload();
      await refresh();
      notify(kind === "members" ? "Member removed." : "Invitation revoked.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function resend(invitation: Invitation) {
    setBusy(true);
    setError("");
    try {
      await api.post(`${url}/invitations`, {
        email: invitation.email,
        role: invitation.role,
        department_id: invitation.department_id,
      });
      invitations.reload();
      notify("Invitation resent. The previous link has been replaced.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function transfer(member: Member) {
    if (
      !window.confirm(
        `Transfer ownership to ${member.user.name}? You will become an administrator.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api.post(`${url}/transfer-ownership`, { membership_id: member.id });
      members.reload();
      await refresh();
      notify("Ownership transferred.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const roleFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          className="select-input"
          defaultValue={editing?.role || "member"}
        >
          {catalog.roles
            .filter((r) => r.value !== "owner")
            .map((r) => (
              <option key={r.value} value={r.value}>
                {r.value[0].toUpperCase() + r.value.slice(1)}
              </option>
            ))}
        </select>
        <p className="text-[11px] leading-5 text-muted-foreground">
          Admins manage company and team settings. Managers manage departments.
          Members and viewers have read access in v0.1.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="department_id">Department</Label>
        <select
          id="department_id"
          name="department_id"
          className="select-input"
          defaultValue={editing?.department_id || ""}
        >
          <option value="">No department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
  return (
    <>
      <PageHeading
        eyebrow="PEOPLE & ACCESS"
        title="Team members"
        description="Good teams keep things moving. Bring yours together."
        action={
          manage ? (
            <Button
              onClick={() => {
                setDialog(true);
                setError("");
              }}
            >
              <Plus size={16} />
              Invite member
            </Button>
          ) : undefined
        }
      />
      <div className="mb-7 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-5 py-4">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium">
            The right access, for every person
          </p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Roles and departments apply to this organization. Members can belong
            to other companies with different roles.
          </p>
        </div>
      </div>
      {!inviteOpen && !editing && (
        <ErrorBox
          message={
            error || members.error || invitations.error || departmentsError
          }
        />
      )}
      <section className="panel">
        <div className="flex gap-7 border-b px-6">
          <button
            onClick={() => setTab("members")}
            className={`tab ${tab === "members" ? "selected" : ""}`}
          >
            <Users size={15} />
            Members <span>{members.data?.total ?? "…"}</span>
          </button>
          {manage && (
            <button
              onClick={() => setTab("invitations")}
              className={`tab ${tab === "invitations" ? "selected" : ""}`}
            >
              <Mail size={15} />
              Invitations <span>{invitations.data?.total ?? "…"}</span>
            </button>
          )}
        </div>
        {tab === "members" ? (
          !members.data ? (
            <Loading />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Department</th>
                    {manage && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.data.data.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            {member.user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user.name}
                              {member.user.id === user.id && (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            member.role === "owner" ? "default" : "secondary"
                          }
                          className="capitalize"
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground">
                        {member.department?.name || "Unassigned"}
                      </td>
                      {manage && (
                        <td>
                          <div className="flex justify-end gap-1">
                            {member.role !== "owner" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit ${member.user.name}`}
                                  disabled={busy}
                                  onClick={() => {
                                    setEditing(member);
                                    setError("");
                                  }}
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  aria-label={`Remove ${member.user.name}`}
                                  disabled={busy}
                                  onClick={() => remove("members", member.id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                                {can("ownership.transfer") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => transfer(member)}
                                  >
                                    Make owner
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : !invitations.data ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Expires</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.data.data.map((invite) => (
                  <tr key={invite.id}>
                    <td className="font-medium">{invite.email}</td>
                    <td>
                      <Badge variant="secondary" className="capitalize">
                        {invite.role}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">
                      {formatDate(invite.expires_at, org.timezone)}
                      {new Date(invite.expires_at) < new Date() && (
                        <span className="ml-2 text-red-600">Expired</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => resend(invite)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove("invitations", invite.id)}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
                {!invitations.data.data.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No pending invitations. Your next teammate is one email
                      away.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {tab === "members" && members.data && (
        <Pagination
          page={page}
          last={members.data.last_page}
          onChange={setPage}
        />
      )}
      {tab === "invitations" && invitations.data && (
        <Pagination
          page={invitePage}
          last={invitations.data.last_page}
          onChange={setInvitePage}
        />
      )}
      <Sheet
        open={manage && (inviteOpen || !!editing)}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <SheetContent side="right" size="default" className="p-0">
          <form onSubmit={save} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {editing ? "Edit team member" : "Invite a teammate"}
              </SheetTitle>
              <SheetDescription>
                {editing
                  ? "Update this member’s access and department."
                  : `Send an invitation to join ${org.name}. The link expires in 7 days.`}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-5">
              <ErrorBox message={error || departmentsError} />
              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    name="email"
                    type="email"
                    placeholder="teammate@company.com"
                    required
                    maxLength={254}
                    className="bg-white"
                  />
                </div>
              )}
              {roleFields}
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} />
                )}{" "}
                {editing ? "Save changes" : "Send invitation"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
