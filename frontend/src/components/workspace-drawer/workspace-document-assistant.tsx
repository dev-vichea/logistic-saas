"use client";

import React, { useRef, useState, ReactNode } from "react";
import {
  FileText,
  FileUp,
  Sparkles,
  Loader2,
  Check,
  ZoomIn,
  ZoomOut,
  Trash2,
  Map as MapIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AssistantDocItem = {
  id: string;
  name: string;
  url: string;
  type?: string;
  isSample?: boolean;
  extracted?: {
    confidence: number;
    fields?: Record<string, string | number | undefined>;
    [key: string]: unknown;
  };
};

export interface WorkspaceDocumentAssistantProps {
  documents: AssistantDocItem[];
  activeDocId?: string | null;
  onSelectDoc: (id: string) => void;
  onUpload: (files: FileList) => void;
  onRemove?: (id: string) => void;
  onExtract?: () => void;
  extracting?: boolean;
  extractionProgress?: number;
  extractionMessage?: string;
  onApplyExtracted?: (extracted: NonNullable<AssistantDocItem["extracted"]>) => void;
  onLoadSample?: () => void;
  sampleDocLabel?: string;
  sampleDocumentPreview?: ReactNode;
  mapTabContent?: ReactNode;
  mapTabBadge?: string;
  acceptedFileTypes?: string[];
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
}

export function WorkspaceDocumentAssistant({
  documents,
  activeDocId,
  onSelectDoc,
  onUpload,
  onRemove,
  onExtract,
  extracting = false,
  extractionProgress = 0,
  extractionMessage = "Extracting data...",
  onApplyExtracted,
  onLoadSample,
  sampleDocLabel = "Load Sample Document",
  sampleDocumentPreview,
  mapTabContent,
  mapTabBadge,
  acceptedFileTypes = ["Invoice", "Packing List", "Bill of Lading", "Waybill"],
  emptyStateTitle = "Upload Trade Document",
  emptyStateDescription = "Drag and drop your B/L, Commercial Invoice, Packing List, or Waybill here.",
  className,
}: WorkspaceDocumentAssistantProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoomScale, setZoomScale] = useState(100);
  const [tab, setTab] = useState<"document" | "map">("document");

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0] || null;

  return (
    <div className={`flex h-full flex-col overflow-hidden bg-white ${className || ""}`}>
      {/* Top Document Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded bg-red-100 text-red-600">
            <FileText size={14} />
          </span>
          {documents.length > 0 ? (
            <Select
              value={activeDoc?.id || ""}
              onValueChange={(val) => onSelectDoc(val)}
            >
              <SelectTrigger className="h-7 min-w-36 max-w-56 border-slate-200 bg-white text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs font-semibold text-slate-700">Document Assistant</span>
          )}
        </div>

        {/* Actions & Zoom Controls */}
        <div className="flex items-center gap-1">
          {activeDoc && (
            <>
              <div className="hidden sm:flex items-center rounded border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(50, prev - 25))}
                  className="p-1 text-slate-500 hover:text-slate-800"
                  title="Zoom out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="px-1.5 text-[11px] font-mono text-slate-600">{zoomScale}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(200, prev + 25))}
                  className="p-1 text-slate-500 hover:text-slate-800"
                  title="Zoom in"
                >
                  <ZoomIn size={13} />
                </button>
              </div>

              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onRemove(activeDoc.id)}
                  className="size-7 p-0 text-slate-400 hover:text-red-600"
                  title="Remove document"
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </>
          )}

          {/* Extract Button */}
          {onExtract && (
            <Button
              size="sm"
              type="button"
              onClick={onExtract}
              disabled={!activeDoc || extracting}
              className="h-7 gap-1 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-2xs font-medium"
            >
              {extracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span>{extracting ? "Extracting..." : "Extract Data"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
          }
        }}
      />

      {/* Document Main Display Area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar bg-slate-100 flex flex-col">
        {tab === "document" ? (
          activeDoc ? (
            <div className="flex flex-col h-full">
              {/* Extraction Progress Banner */}
              {extracting && (
                <div className="border-b border-blue-200 bg-blue-50 px-4 py-2.5 text-xs">
                  <div className="flex items-center justify-between text-blue-900 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="animate-spin text-blue-600" />
                      {extractionMessage}
                    </span>
                    <span>{extractionProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${extractionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extracted Values Review Card */}
              {activeDoc.extracted && !extracting && onApplyExtracted && (
                <div className="border-b border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px] h-5">
                        {activeDoc.extracted.confidence}% AI Confidence
                      </Badge>
                      <span className="text-[11px] text-muted-foreground truncate max-w-40">
                        From {activeDoc.name}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => onApplyExtracted(activeDoc.extracted!)}
                      className="h-6 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <Check size={11} className="mr-1" /> Apply to Form
                    </Button>
                  </div>

                  {activeDoc.extracted.fields && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] rounded border border-slate-100 bg-slate-50/70 p-2 font-mono">
                      {Object.entries(activeDoc.extracted.fields).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-slate-400 font-sans capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                          <span className="font-semibold text-slate-800 truncate">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document Preview Rendering */}
              <div className="flex-1 overflow-auto custom-scrollbar p-4 flex items-center justify-center bg-slate-200/60">
                {activeDoc.isSample && sampleDocumentPreview ? (
                  <div
                    style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: "top center" }}
                    className="transition-transform duration-200"
                  >
                    {sampleDocumentPreview}
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeDoc.url}
                    alt={activeDoc.name}
                    className="max-w-full rounded shadow-md object-contain"
                    style={{ transform: `scale(${zoomScale / 100})` }}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Empty State / Upload Dropzone */
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex w-full max-w-sm cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                  <FileUp size={28} />
                </div>
                <h4 className="mt-3 text-sm font-semibold text-slate-800">{emptyStateTitle}</h4>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">{emptyStateDescription}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {acceptedFileTypes.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] bg-slate-50">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              {onLoadSample && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">or test immediately with:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={onLoadSample}
                    className="h-8 gap-1.5 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                  >
                    <Sparkles size={13} className="text-blue-600" />
                    <span>{sampleDocLabel}</span>
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          mapTabContent
        )}
      </div>

      {/* Bottom Switcher: Document Preview vs Route Map */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-3 py-1.5 text-xs">
        <div className="flex items-center rounded-md bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setTab("document")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
              tab === "document" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Document Preview
          </button>
          {mapTabContent && (
            <button
              type="button"
              onClick={() => setTab("map")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                tab === "map" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon size={12} />
              <span>Route Map</span>
              {mapTabBadge && (
                <span className="size-1.5 rounded-full bg-blue-600 ml-0.5" />
              )}
            </button>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

