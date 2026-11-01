"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, History, LayoutList, Paperclip, X } from "lucide-react";
import { ErrorBox, Loading } from "@/components/common";
import { useWorkspace } from "@/components/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import {
  recordActivityLabel,
  type OpenRecord, type RecordActivity, type RecordDocument, type RecordKind,
} from "@/lib/record-workspace";

const tabsEvent = "mekong-record-workspace-tabs";

function storageKey(organizationId: number): string {
  return `mekong-record-workspace:${organizationId}`;
}

function tabsSnapshot(organizationId: number): string {
  if (typeof window === "undefined") return "[]";
  try {
    return sessionStorage.getItem(storageKey(organizationId)) ?? "[]";
  } catch {
    return "[]";
  }
}

function publishTabs(organizationId: number, tabs: OpenRecord[]) {
  try {
    const next = JSON.stringify(tabs);
    if (tabsSnapshot(organizationId) === next) return;
    sessionStorage.setItem(storageKey(organizationId), next);
    window.dispatchEvent(new Event(tabsEvent));
  } catch {
    // Browsers without session storage can still navigate between records.
  }
}

function subscribeTabs(callback: () => void): () => void {
  window.addEventListener(tabsEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(tabsEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function parseTabs(snapshot: string): OpenRecord[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    return Array.isArray(value) ? value.filter((tab): tab is OpenRecord =>
      tab !== null && typeof tab === "object" && typeof tab.href === "string" &&
      typeof tab.id === "number" && (tab.kind === "material-request" || tab.kind === "purchase-order"),
    ) : [];
  } catch {
    return [];
  }
}

function readTabs(organizationId: number): OpenRecord[] {
  return parseTabs(tabsSnapshot(organizationId));
}

export function openWorkspaceRecord(organizationId: number, record: OpenRecord) {
  const tabs = readTabs(organizationId);
  const index = tabs.findIndex((tab) => tab.kind === record.kind && tab.id === record.id);
  if (index < 0) tabs.push(record);
  else tabs[index] = record;
  publishTabs(organizationId, tabs);
}

export function RelatedRecordButton({
  organizationId, record, children,
}: {
  organizationId: number;
  record: OpenRecord;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => { openWorkspaceRecord(organizationId, record); router.push(record.href); }}>
      {children}
    </Button>
  );
}

function formatMoment(value: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium", timeStyle: "short", timeZone: timezone,
  }).format(new Date(value));
}

function ActivityTimeline({ events, timezone }: { events: RecordActivity[]; timezone: string }) {
  if (events.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</p>;
  return (
    <ol className="space-y-0" aria-label="Record activity">
      {events.map((event) => (
        <li key={event.id} className="relative border-l border-slate-200 py-4 pl-6 last:border-transparent">
          <span className="absolute -left-[5px] top-6 size-2.5 rounded-full border-2 border-blue-800 bg-white" />
          <p className="text-sm font-semibold text-slate-900">{recordActivityLabel(event.action)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{event.actor_name ?? "System"} · {formatMoment(event.created_at, timezone)}</p>
        </li>
      ))}
    </ol>
  );
}

export function RecordWorkspace({
  organizationId, kind, id, number, title, subtitle, status, listHref,
  apiUrl, canManage, actions, overview, materials, externalError, refreshToken = 0,
}: {
  organizationId: number;
  kind: RecordKind;
  id: number;
  number: string;
  title: string;
  subtitle: string;
  status: string;
  listHref: string;
  apiUrl: string;
  canManage: boolean;
  actions: ReactNode;
  overview: ReactNode;
  materials: ReactNode;
  externalError?: string;
  refreshToken?: number;
}) {
  const router = useRouter();
  const { organization, notify } = useWorkspace();
  const [section, setSection] = useState("overview");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const snapshot = useSyncExternalStore(subscribeTabs, () => tabsSnapshot(organizationId), () => "[]");
  const openTabs = parseTabs(snapshot);
  const current: OpenRecord = { kind, id, label: number, title, href: `${listHref}/${id}` };
  const activity = useResource<{ data: RecordActivity[] }>(`${apiUrl}/activity?revision=${refreshToken}`);
  const documents = useResource<{ data: RecordDocument[] }>(`${apiUrl}/documents`);
  const selectedDocument = documents.data?.data.find((document) => document.id === selectedDocumentId)
    ?? documents.data?.data[0] ?? null;
  const previewUrl = selectedDocument ? `${apiUrl}/documents/${selectedDocument.id}/content` : null;
  const events = activity.data?.data ?? [];
  const timezone = organization?.timezone ?? "Asia/Phnom_Penh";

  useEffect(() => {
    openWorkspaceRecord(organizationId, { kind, id, label: number, title, href: `${listHref}/${id}` });
  }, [organizationId, kind, id, number, title, listHref]);

  function closeTab(record: OpenRecord) {
    const remaining = readTabs(organizationId).filter((tab) => !(tab.kind === record.kind && tab.id === record.id));
    publishTabs(organizationId, remaining);
    if (record.kind === kind && record.id === id) {
      router.push(remaining.at(-1)?.href ?? listHref);
    }
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    const data = new FormData();
    data.append("file", file);
    try {
      const result = await api.post<{ data: RecordDocument }>(`${apiUrl}/documents`, data);
      setSelectedDocumentId(result.data.data.id);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      documents.reload();
      activity.reload();
      notify("Document uploaded.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument(document: RecordDocument) {
    if (!window.confirm(`Remove ${document.file_name} from this record?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`${apiUrl}/documents/${document.id}`);
      if (selectedDocumentId === document.id) setSelectedDocumentId(null);
      documents.reload();
      activity.reload();
      notify("Document removed.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-white text-slate-900" aria-label={`${kind === "material-request" ? "Material request" : "Purchase order"} workspace`}>
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div role="tablist" aria-label="Open records" className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
          {openTabs.map((record) => {
            const active = record.kind === kind && record.id === id;
            return (
              <div key={`${record.kind}:${record.id}`} className={`flex min-w-44 max-w-64 items-center rounded-t-lg border border-b-0 ${active ? "border-slate-200 bg-white text-blue-950 shadow-sm" : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                <button role="tab" aria-selected={active} onClick={() => router.push(record.href)} className="min-w-0 flex-1 px-3 py-2 text-left">
                  <span className="block truncate text-xs font-semibold">{record.label}</span>
                  <span className="block truncate text-[11px]">{record.title}</span>
                </button>
                <button onClick={() => closeTab(record)} aria-label={`Close ${record.label}`} className="mr-2 rounded p-1 hover:bg-slate-200"><X size={14} /></button>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" onClick={() => closeTab(current)}>Close workspace</Button>
      </div>

      <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">{kind === "material-request" ? "Material Request" : "Purchase Order"} · {number}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1><Badge variant={status === "draft" ? "outline" : "secondary"}>{status === "draft" ? "Draft" : status === "submitted" ? "Submitted" : "Issued"}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      </div>
      <ErrorBox message={externalError || error} />

      <Tabs value={section} onValueChange={setSection} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-auto shrink-0 justify-start rounded-none border-b border-slate-200 bg-white px-4 py-1 sm:px-7">
          <TabsTrigger value="overview" className="gap-2"><LayoutList size={15} /> Overview</TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">Materials</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><History size={15} /> Activity</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><Paperclip size={15} /> Documents{documents.data?.data.length ? ` (${documents.data.data.length})` : ""}</TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,38%)] lg:overflow-hidden">
          <div className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto">
            <TabsContent value="overview" className="m-0 space-y-5">{overview}</TabsContent>
            <TabsContent value="materials" className="m-0">{materials}</TabsContent>
            <TabsContent value="activity" className="m-0 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold">Activity timeline</h2>
              {activity.error ? <ErrorBox message={activity.error} /> : !activity.data ? <Loading /> : <ActivityTimeline events={events} timezone={timezone} />}
            </TabsContent>
            <TabsContent value="documents" className="m-0 space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold">Record documents</h2>
                <p className="mt-1 text-sm text-muted-foreground">PDF, PNG, JPG, or WEBP files up to 10 MB.</p>
                {canManage && (
                  <form onSubmit={upload} className="mt-5 flex flex-wrap items-end gap-2">
                    <Input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" aria-label="Choose document" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="max-w-sm" />
                    <Button type="submit" disabled={!file || busy}>Upload document</Button>
                  </form>
                )}
                {documents.error && <ErrorBox message={documents.error} />}
                <div className="mt-5 divide-y divide-slate-100">
                  {documents.data?.data.map((document) => (
                    <div key={document.id} className="flex items-center gap-3 py-3">
                      <FileText size={18} className="shrink-0 text-blue-800" />
                      <button onClick={() => setSelectedDocumentId(document.id)} className="min-w-0 flex-1 text-left text-sm hover:text-blue-800">
                        <span className="block truncate font-medium">{document.file_name}</span>
                        <span className="text-xs text-muted-foreground">{document.uploaded_by?.name ?? "Team member"} · {formatMoment(document.created_at, timezone)} · {(document.file_size_bytes / 1024).toFixed(0)} KB</span>
                      </button>
                      <Button asChild variant="ghost" size="sm"><a href={`${apiUrl}/documents/${document.id}/content?download=1`} aria-label={`Download ${document.file_name}`}><Download size={15} /></a></Button>
                      {canManage && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => removeDocument(document)} aria-label={`Remove ${document.file_name}`}><X size={15} /></Button>}
                    </div>
                  ))}
                  {documents.data?.data.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No documents attached yet.</p>}
                </div>
              </section>
            </TabsContent>
          </div>

          <aside className="min-w-0 border-t border-slate-200 bg-white lg:overflow-y-auto lg:border-l lg:border-t-0" aria-label="Record side panel">
            {section !== "activity" && section !== "documents" && (
              <section className="border-b border-slate-200 p-5">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide">Recent activity</h2><Button variant="ghost" size="sm" onClick={() => setSection("activity")}>View all</Button></div>
                {activity.error ? <ErrorBox message={activity.error} /> : !activity.data ? <Loading /> : <ActivityTimeline events={events.slice(0, 3)} timezone={timezone} />}
              </section>
            )}
            <section className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div><h2 className="text-sm font-semibold uppercase tracking-wide">Document preview</h2><p className="mt-1 truncate text-xs text-muted-foreground">{selectedDocument?.file_name ?? "No document selected"}</p></div>
                {selectedDocument && <Button asChild variant="outline" size="sm"><a href={`${previewUrl}?download=1`}><Download size={14} /> Download</a></Button>}
              </div>
              {previewUrl ? (
                <iframe key={previewUrl} src={previewUrl} title={`Preview ${selectedDocument?.file_name}`} className="h-[520px] w-full rounded-lg border border-slate-200 bg-slate-50 lg:h-[min(65vh,800px)]" />
              ) : (
                <div className="grid h-64 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-muted-foreground">Upload a PDF or image to preview it here.</div>
              )}
            </section>
          </aside>
        </div>
      </Tabs>
    </div>
  );
}
