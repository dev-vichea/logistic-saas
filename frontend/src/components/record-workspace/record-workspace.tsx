"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  FileText,
  FileUp,
  History,
  LayoutList,
  Maximize2,
  Minimize2,
  Paperclip,
  X,
} from "lucide-react";
import { ErrorBox, Loading } from "@/components/common";
import { useWorkspace } from "@/components/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
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

export function RecordDrawerShell({
  children,
  onClose,
  ariaLabel,
  title = "Record workspace",
  description = "Record details and actions",
  size = "4/5",
}: {
  children: ReactNode;
  onClose: () => void;
  ariaLabel?: string;
  title?: string;
  description?: string;
  size?: "default" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "3/4" | "4/5" | "full";
}) {
  return (
    <Sheet open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        size={size}
        className="flex flex-col gap-0 border-l border-slate-200 p-0 overflow-hidden rounded-tl-2xl shadow-2xl transition-all duration-300"
        showCloseButton={false}
        aria-label={ariaLabel}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
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
  const [rightPanelTab, setRightPanelTab] = useState<"document" | "activity">("document");
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    <RecordDrawerShell
      onClose={() => closeTab(current)}
      ariaLabel={`${kind === "material-request" ? "Material request" : "Purchase order"} workspace`}
      title={`${kind === "material-request" ? "Material Request" : "Purchase Order"} ${number}`}
      description={title}
      size={isFullscreen ? "full" : "4/5"}
    >
      {/* Vektor-style Top Tab Drafts Bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <div role="tablist" aria-label="Open records" className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto custom-scrollbar">
          {openTabs.map((record) => {
            const active = record.kind === kind && record.id === id;
            return (
              <div
                key={`${record.kind}:${record.id}`}
                className={`group flex min-w-44 max-w-64 items-center rounded-t-lg border border-b-0 transition-all ${
                  active
                    ? "border-slate-200 bg-white text-blue-950 shadow-2xs font-semibold"
                    : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                }`}
              >
                <span className={`ml-2.5 size-2 rounded-xs shrink-0 ${active ? "bg-blue-600" : "bg-slate-300 group-hover:bg-slate-400"}`} />
                <button
                  role="tab"
                  aria-selected={active}
                  onClick={() => router.push(record.href)}
                  className="min-w-0 flex-1 px-2.5 py-1.5 text-left"
                >
                  <span className="block truncate text-xs font-semibold leading-tight">{record.label}</span>
                  <span className="block truncate text-[11px] font-normal text-muted-foreground leading-tight">{record.title}</span>
                </button>
                <button
                  onClick={() => closeTab(record)}
                  aria-label={`Close ${record.label}`}
                  className="mr-1.5 rounded p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Top Right Controls (Fullscreen toggle + Close workspace) */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 h-8 px-2.5"
            title={isFullscreen ? "Switch to 4/5 drawer" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? "Standard 4/5" : "Fullscreen"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => closeTab(current)}
            className="gap-1.5 text-slate-600 hover:text-slate-900 h-8 px-2.5"
            aria-label="Close workspace"
          >
            <X size={15} />
            <span>Close workspace</span>
          </Button>
        </div>
      </div>

      {/* Record Header & Actions */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                {kind === "material-request" ? "Material Request" : "Purchase Order"} · {number}
              </span>
              <Badge variant={status === "draft" ? "outline" : "secondary"} className="text-[11px] h-5">
                {status === "draft" ? "Draft" : status === "submitted" ? "Submitted" : "Issued"}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      </div>
      <ErrorBox message={externalError || error} />

      {/* Main 2-Column Split Body (Vektor-style Left Form / Right Full-height PDF) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
        {/* Left Column: Editable Record & Tabs */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <Tabs value={section} onValueChange={setSection} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="h-auto shrink-0 justify-start rounded-none border-b border-slate-200 bg-white px-4 py-1 sm:px-6">
              <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutList size={14} /> Overview</TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5 text-xs">Materials</TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs"><History size={14} /> Activity</TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5 text-xs">
                <Paperclip size={14} /> Documents{documents.data?.data.length ? ` (${documents.data.data.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
              <TabsContent value="overview" className="m-0 space-y-4">{overview}</TabsContent>
              <TabsContent value="materials" className="m-0">{materials}</TabsContent>
              <TabsContent value="activity" className="m-0 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold mb-3">Activity timeline</h2>
                {activity.error ? <ErrorBox message={activity.error} /> : !activity.data ? <Loading /> : <ActivityTimeline events={events} timezone={timezone} />}
              </TabsContent>
              <TabsContent value="documents" className="m-0 space-y-4">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-semibold">Record documents</h2>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG, or WEBP trade documents up to 10 MB.</p>
                  {canManage && (
                    <form onSubmit={upload} className="mt-4 flex flex-wrap items-end gap-2">
                      <Input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" aria-label="Choose document" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="max-w-sm h-8 text-xs" />
                      <Button type="submit" size="sm" disabled={!file || busy}>Upload document</Button>
                    </form>
                  )}
                  {documents.error && <ErrorBox message={documents.error} />}
                  <div className="mt-4 divide-y divide-slate-100">
                    {documents.data?.data.map((document) => (
                      <div key={document.id} className="flex items-center gap-3 py-2.5">
                        <FileText size={16} className="shrink-0 text-blue-800" />
                        <button onClick={() => { setSelectedDocumentId(document.id); setRightPanelTab("document"); }} className="min-w-0 flex-1 text-left text-xs hover:text-blue-800">
                          <span className="block truncate font-medium">{document.file_name}</span>
                          <span className="text-[11px] text-muted-foreground">{document.uploaded_by?.name ?? "Team member"} · {formatMoment(document.created_at, timezone)} · {(document.file_size_bytes / 1024).toFixed(0)} KB</span>
                        </button>
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2"><a href={`${apiUrl}/documents/${document.id}/content?download=1`} aria-label={`Download ${document.file_name}`}><Download size={13} /></a></Button>
                        {canManage && <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={busy} onClick={() => removeDocument(document)} aria-label={`Remove ${document.file_name}`}><X size={13} /></Button>}
                      </div>
                    ))}
                    {documents.data?.data.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No documents attached yet.</p>}
                  </div>
                </section>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column: Vektor Dedicated PDF / Document Preview Panel (Full-height!) */}
        <div className="flex min-h-[450px] lg:min-h-0 flex-1 flex-col overflow-hidden bg-slate-100/70" aria-label="Record side panel">
          {/* Vektor PDF Toolbar */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-red-100 text-[9px] font-bold text-red-700">
                PDF
              </span>
              {documents.data?.data && documents.data.data.length > 1 ? (
                <Select
                  value={String(selectedDocument?.id ?? "")}
                  onValueChange={(val) => { setSelectedDocumentId(Number(val)); setRightPanelTab("document"); }}
                >
                  <SelectTrigger className="h-6 text-xs font-semibold max-w-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.data.data.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)} className="text-xs">
                        {doc.file_name} ({(doc.file_size_bytes / 1024).toFixed(0)} KB)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="truncate text-xs font-semibold text-slate-800">
                  {selectedDocument?.file_name ?? "Document preview"}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {selectedDocument && previewUrl && (
                <>
                  <Button asChild variant="ghost" size="sm" className="size-7 p-0 text-slate-500 hover:text-slate-900" title="Download">
                    <a href={`${previewUrl}?download=1`} aria-label={`Download ${selectedDocument.file_name}`}>
                      <Download size={14} />
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="size-7 p-0 text-slate-500 hover:text-slate-900" title="Open in new tab">
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab">
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                </>
              )}
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-slate-700 hover:text-slate-900"
                  onClick={() => { setSection("documents"); fileInput.current?.click(); }}
                >
                  <FileUp size={13} />
                  <span>Upload</span>
                </Button>
              )}
            </div>
          </div>

          {/* Full-height Document View Area */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100 flex flex-col">
            {rightPanelTab === "document" ? (
              previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title={`Preview ${selectedDocument?.file_name}`}
                  className="size-full border-0 bg-white"
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500 mb-3">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">No document attached</h3>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Upload a trade document, bill of lading, or confirmation to view it alongside this record like Vektor.
                  </p>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-1.5 text-xs h-8"
                      onClick={() => { setSection("documents"); fileInput.current?.click(); }}
                    >
                      <FileUp size={13} />
                      <span>Upload file</span>
                    </Button>
                  )}
                </div>
              )
            ) : (
              <div className="size-full overflow-y-auto custom-scrollbar bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Audit Activity Log</h3>
                {activity.error ? <ErrorBox message={activity.error} /> : !activity.data ? <Loading /> : <ActivityTimeline events={events} timezone={timezone} />}
              </div>
            )}
          </div>

          {/* Vektor-style Bottom Switcher Pill */}
          <div className="flex shrink-0 items-center justify-center border-t border-slate-200 bg-white py-1.5 px-4">
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setRightPanelTab("document")}
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  rightPanelTab === "document"
                    ? "bg-white text-blue-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Document Preview {documents.data?.data.length ? `(${documents.data.data.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab("activity")}
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  rightPanelTab === "activity"
                    ? "bg-white text-blue-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Activity Timeline
              </button>
            </div>
          </div>
        </div>
      </div>
    </RecordDrawerShell>
  );
}
