"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Send,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Building2,
  Ship,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCcw,
  FileUp,
  ExternalLink,
  Download,
  Check,
  ChevronDown,
  Briefcase,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api";
import { freightRoot, type Quotation, type FreightCatalog } from "@/lib/freight";
import { partnerRoot, type Partner } from "@/lib/partners";
import { useResource } from "@/lib/use-resource";
import { useWorkspace } from "@/components/workspace";

// ─── TYPES ──────────────────────────────────────────────────────────

export interface QuotationLineItemDraft {
  id?: number | string;
  description: string;
  category: "service" | "pass_through";
  charge_type: string;
  charge_per: string; // "CTNR" | "SHPT" | "SET" | "CBM" | "TRIP"
  quantity: number | string;
  unit_price: number | string;
  currency: string;
}

export interface QuotationFormState {
  id?: number;
  freight_request_id?: number | null;
  quotation_number: string;
  revision: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  customer_id: string;
  customer_name: string;
  attention_name: string;
  issued_by: string;
  issued_date: string;
  valid_until: string;
  transport_mode: "ocean_fcl" | "ocean_lcl" | "air" | "road" | "multimodal";
  incoterm: string;
  commodity: string;
  origin_location_id: string;
  origin_name: string;
  destination_location_id: string;
  destination_name: string;
  subject_object: string;
  notes: string;
  terms_and_conditions: string;
  line_items: QuotationLineItemDraft[];
}

export interface QuotationDraftTab {
  id: string;
  label: string;
  form: QuotationFormState;
}

// ─── REAL PRESETS (Directly From Your Cambodian Quotes) ─────────────

const PRESET_SIH_FCL: Partial<QuotationFormState> = {
  transport_mode: "ocean_fcl",
  incoterm: "CIF",
  commodity: "Garments & Accessories",
  subject_object: "IMPORT-CIF-FCL-POL//SIH-CUSTOMS-CLEARANCE",
  terms_and_conditions:
    "- Empty container return to Sihanoukville Port: USD 30/20', USD 50/40'\n- Storage and Demurrage charge as per port receipt\n- Overtime inspection charge: USD 80/CTNR (if any)\n- Standby charge: USD 50/CTNR/day after 12 hours free time at factory\n- Diesel fuel price surcharge applies per official index",
  line_items: [
    {
      description: "Customs Import Permit",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "HBL",
      quantity: 1,
      unit_price: 40.0,
      currency: "USD",
    },
    {
      description: "Customs Clearance (20'GP/40'HC)",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 180.0,
      currency: "USD",
    },
    {
      description: "Trucking Delivery (PAS Sihanoukville -> Factory)",
      category: "service",
      charge_type: "trucking",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 280.0,
      currency: "USD",
    },
    {
      description: "Forwarder Handling Fee",
      category: "service",
      charge_type: "handling",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 35.0,
      currency: "USD",
    },
    {
      description: "No Original Insurance Fee",
      category: "service",
      charge_type: "documentation",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 20.0,
      currency: "USD",
    },
    {
      description: "Port LOLO (Lift-on / Lift-off as per receipt)",
      category: "pass_through",
      charge_type: "port_lolo",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 95.7,
      currency: "USD",
    },
    {
      description: "Port TC Scan (X-Ray Scanning as per receipt)",
      category: "pass_through",
      charge_type: "scanning",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 17.0,
      currency: "USD",
    },
    {
      description: "Customs Processing Fee (as per receipt)",
      category: "pass_through",
      charge_type: "customs_processing",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 15.0,
      currency: "USD",
    },
  ],
};

const PRESET_PNH_FCL: Partial<QuotationFormState> = {
  transport_mode: "ocean_fcl",
  incoterm: "CIF",
  commodity: "Garments & Textiles",
  subject_object: "IMPORT-CIF-FCL-POL//PNH-CUSTOMS-CLEARANCE",
  terms_and_conditions:
    "- Port gate fee USD 10/CTNR included\n- Port LOLO as per PPAP receipt (USD 50.60/20', USD 77.00/40')\n- Extra declaration USD 50/set if > 1 B/L\n- VAT 10% on local logistics services",
  line_items: [
    {
      description: "Import Permit",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 40.0,
      currency: "USD",
    },
    {
      description: "Customs Clearance (PPAP LM17)",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 210.0,
      currency: "USD",
    },
    {
      description: "Trucking Delivery (PNH Port -> Factory)",
      category: "service",
      charge_type: "trucking",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 220.0,
      currency: "USD",
    },
    {
      description: "Port Gate Fee",
      category: "service",
      charge_type: "gate_fee",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 10.0,
      currency: "USD",
    },
    {
      description: "Port LOLO (as per receipt)",
      category: "pass_through",
      charge_type: "port_lolo",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 77.0,
      currency: "USD",
    },
    {
      description: "Customs Processing Fee (as per receipt)",
      category: "pass_through",
      charge_type: "customs_processing",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 15.0,
      currency: "USD",
    },
    {
      description: "Handling Fee",
      category: "service",
      charge_type: "handling",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 35.0,
      currency: "USD",
    },
  ],
};

const PRESET_AIR_KTI: Partial<QuotationFormState> = {
  transport_mode: "air",
  incoterm: "CIF",
  commodity: "Garments / Electronic Components",
  subject_object: "IMPORT-CIF-AIR-AOL//KTI-CUSTOMS-CLEARANCE",
  terms_and_conditions:
    "- Air cargo handling at Phnom Penh KTI Airport\n- Warehouse storage as per cargo receipt\n- Express import permit available at USD 60/set\n- Deposit fee: 1% if invoice value > USD 6,000",
  line_items: [
    {
      description: "Air Cargo Customs Clearance",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "SET",
      quantity: 1,
      unit_price: 140.0,
      currency: "USD",
    },
    {
      description: "Customs Import Permit",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "CTNR",
      quantity: 1,
      unit_price: 40.0,
      currency: "USD",
    },
    {
      description: "Airport Trucking (KTI Airport -> Factory)",
      category: "service",
      charge_type: "trucking",
      charge_per: "TRIP",
      quantity: 1,
      unit_price: 60.0,
      currency: "USD",
    },
    {
      description: "Handling Fee",
      category: "service",
      charge_type: "handling",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 35.0,
      currency: "USD",
    },
    {
      description: "Customs Processing Fee (as per receipt)",
      category: "pass_through",
      charge_type: "customs_processing",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 13.75,
      currency: "USD",
    },
  ],
};

const PRESET_ROAD_CROSSBORDER: Partial<QuotationFormState> = {
  transport_mode: "road",
  incoterm: "DAP",
  commodity: "Textiles & Garment Accessories",
  subject_object: "CROSS-BORDER-ROAD//HO-CHI-MINH-PHNOM-PENH",
  terms_and_conditions:
    "- Cross-border trucking HCM City ➔ Phnom Penh via Bavet / Moc Bai\n- Border transit clearance included (1 declaration)\n- Tolls, border transit fees, and GPS tracking included\n- Detention: 24h free time at loading/unloading; thereafter USD 75/day",
  line_items: [
    {
      description: "Cross-Border Trucking (HCM -> Phnom Penh)",
      category: "service",
      charge_type: "trucking",
      charge_per: "TRIP",
      quantity: 1,
      unit_price: 650.0,
      currency: "USD",
    },
    {
      description: "Customs Clearance & Border Transit Formalities",
      category: "service",
      charge_type: "customs_clearance",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 160.0,
      currency: "USD",
    },
    {
      description: "Handling & Local Administration Fee",
      category: "service",
      charge_type: "handling",
      charge_per: "SHPT",
      quantity: 1,
      unit_price: 40.0,
      currency: "USD",
    },
    {
      description: "Border Inspection Fee (as per receipt)",
      category: "pass_through",
      charge_type: "customs_processing",
      charge_per: "TRIP",
      quantity: 1,
      unit_price: 25.0,
      currency: "USD",
    },
    {
      description: "Customs Seals & Processing (as per receipt)",
      category: "pass_through",
      charge_type: "customs_processing",
      charge_per: "TRIP",
      quantity: 1,
      unit_price: 15.0,
      currency: "USD",
    },
  ],
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────

export function QuotationStudioWorkspace({
  open,
  onOpenChange,
  catalog,
  existingQuotation,
  quotationId,
  initialRequestId,
  defaultQuoteNumber,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog?: FreightCatalog | null;
  existingQuotation?: Quotation | null;
  quotationId?: number | null;
  initialRequestId?: number | null;
  defaultQuoteNumber?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { organization, notify } = useWorkspace();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(100);
  const [saving, setSaving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Embedded PDF Viewer State (Live A4 vs. Embedded Reference PDF)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfViewMode, setPdfViewMode] = useState<"a4" | "reference">("a4");
  const [referencePdfUrl, setReferencePdfUrl] = useState<string | null>(null);
  const [referencePdfName, setReferencePdfName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePdfUpload = useCallback((file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Please select a valid PDF document.");
      return;
    }
    const url = URL.createObjectURL(file);
    setReferencePdfUrl(url);
    setReferencePdfName(file.name);
    setPdfViewMode("reference");
    notify(`Loaded embed PDF: ${file.name}`);
  }, [notify]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfUpload(e.dataTransfer.files[0]);
    }
  }, [handlePdfUpload]);

  // Load customer partners
  const partnersRes = useResource<{ data: Partner[] }>(
    organization ? `${partnerRoot(organization.id)}?per_page=100` : null,
  );
  const partners = partnersRes.data?.data || [];
  const customers = partners.filter(
    (p) => p.roles.includes("customer") || p.roles.includes("shipper"),
  );

  // Default Form State & Locations
  const locations = useMemo(() => catalog?.locations || [], [catalog?.locations]);
  const defaultOrigin = locations[0];
  const defaultDest = locations[1] || locations[0];

  const [defaultDates] = useState(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const validUntilStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return { today: todayStr, validUntilDefault: validUntilStr };
  });
  const { today, validUntilDefault } = defaultDates;

  // Initial Quotation Number: deterministic, no Math.random()
  const initialQuoteNum =
    existingQuotation?.quotation_number || defaultQuoteNumber || "QUO-2026-0001";

  // Multi-Draft Tabs State (Vektor TMS Concept Layout)
  const [drafts, setDrafts] = useState<QuotationDraftTab[]>(() => {
    const initialForm: QuotationFormState = existingQuotation
      ? {
          id: existingQuotation.id,
          freight_request_id: existingQuotation.freight_request_id,
          quotation_number: existingQuotation.quotation_number,
          revision: existingQuotation.revision || 1,
          status: existingQuotation.status,
          customer_id: String(existingQuotation.customer_id || ""),
          customer_name: existingQuotation.customer?.name || "Customer",
          attention_name: "San Rithea",
          issued_by: "ShipFlow Commercial Desk",
          issued_date: existingQuotation.created_at ? existingQuotation.created_at.slice(0, 10) : today,
          valid_until: existingQuotation.valid_until || validUntilDefault,
          transport_mode: existingQuotation.transport_mode || "ocean_fcl",
          incoterm: existingQuotation.incoterm || "CIF",
          commodity: "Garment & Accessories",
          origin_location_id: String(existingQuotation.origin_location_id || ""),
          origin_name: existingQuotation.origin_location?.name || "Origin Port",
          destination_location_id: String(existingQuotation.destination_location_id || ""),
          destination_name: existingQuotation.destination_location?.name || "Destination",
          subject_object: `IMPORT-${existingQuotation.incoterm || "CIF"}-${(existingQuotation.transport_mode || "FCL").toUpperCase()}//CUSTOMS-CLEARANCE`,
          notes: existingQuotation.notes || "",
          terms_and_conditions: existingQuotation.terms_and_conditions || PRESET_SIH_FCL.terms_and_conditions || "",
          line_items:
            existingQuotation.line_items && existingQuotation.line_items.length > 0
              ? existingQuotation.line_items.map((it) => ({
                  id: it.id,
                  description: it.description,
                  category:
                    it.description.toLowerCase().includes("receipt") ||
                    it.description.toLowerCase().includes("lolo") ||
                    it.description.toLowerCase().includes("scan") ||
                    it.charge_type.includes("receipt") ||
                    it.charge_type.includes("port_")
                      ? "pass_through"
                      : "service",
                  charge_type: it.charge_type || "handling",
                  charge_per: "CTNR",
                  quantity: it.quantity,
                  unit_price: it.unit_price,
                  currency: it.currency || "USD",
                }))
              : PRESET_SIH_FCL.line_items || [],
        }
      : {
          quotation_number: initialQuoteNum,
          revision: 1,
          status: "draft",
          freight_request_id: null,
          customer_id: customers[0]?.id ? String(customers[0].id) : "",
          customer_name: customers[0]?.name || "XIN CAI FU (CAMBODIA) CO., LTD.",
          attention_name: "San Rithea",
          issued_by: "ShipFlow Commercial Desk",
          issued_date: today,
          valid_until: validUntilDefault,
          transport_mode: "ocean_fcl",
          incoterm: "CIF",
          commodity: "Garments & Textiles",
          origin_location_id: defaultOrigin?.id ? String(defaultOrigin.id) : "",
          origin_name: defaultOrigin ? `${defaultOrigin.name} (${defaultOrigin.city})` : "Sihanoukville Autonomous Port",
          destination_location_id: defaultDest?.id ? String(defaultDest.id) : "",
          destination_name: defaultDest ? `${defaultDest.name} (${defaultDest.city})` : "Phnom Penh Special Economic Zone",
          subject_object: "IMPORT-CIF-FCL-POL//SIH-CUSTOMS-CLEARANCE",
          notes: "Subject to carrier space availability and diesel fuel price sliding scale.",
          terms_and_conditions: PRESET_SIH_FCL.terms_and_conditions || "",
          line_items: PRESET_SIH_FCL.line_items ? [...PRESET_SIH_FCL.line_items] : [],
        };

    return [
      {
        id: "draft-1",
        label: existingQuotation ? `Quote #${existingQuotation.quotation_number}` : "Draft #1",
        form: initialForm,
      },
    ];
  });

  const [activeDraftId, setActiveDraftId] = useState<string>("draft-1");

  const activeDraft = useMemo(
    () => drafts.find((d) => d.id === activeDraftId) || drafts[0],
    [drafts, activeDraftId],
  );

  const form = activeDraft.form;

  const setForm = useCallback(
    (updaterOrVal: QuotationFormState | ((prev: QuotationFormState) => QuotationFormState)) => {
      setDrafts((prevDrafts) => {
        return prevDrafts.map((d) => {
          if (d.id !== activeDraftId) return d;
          const nextForm = typeof updaterOrVal === "function" ? updaterOrVal(d.form) : updaterOrVal;
          return {
            ...d,
            label: nextForm.id ? `Quote #${nextForm.quotation_number}` : d.label,
            form: nextForm,
          };
        });
      });
    },
    [activeDraftId],
  );

  const addDraftTab = () => {
    const nextIdx = drafts.length + 1;
    const newId = `draft-${Date.now()}`;
    const baseNum = form.quotation_number.replace(/-[A-Z]$/, "");
    const suffix = String.fromCharCode(64 + nextIdx);
    const newQuoteNum = `${baseNum}-${suffix}`;
    const newTab: QuotationDraftTab = {
      id: newId,
      label: `Draft #${nextIdx}`,
      form: {
        ...form,
        id: undefined,
        quotation_number: newQuoteNum,
        revision: 1,
        status: "draft",
      },
    };
    setDrafts((prev) => [...prev, newTab]);
    setActiveDraftId(newId);
    notify(`Created comparison Draft #${nextIdx} (${newQuoteNum})`);
  };

  const closeDraftTab = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (drafts.length === 1) {
      setForm((prev) => ({
        ...prev,
        status: "draft",
        revision: 1,
        line_items: PRESET_SIH_FCL.line_items ? [...PRESET_SIH_FCL.line_items] : [],
      }));
      notify("Reset draft quote items.");
      return;
    }
    const nextDrafts = drafts.filter((d) => d.id !== id);
    setDrafts(nextDrafts);
    if (activeDraftId === id) {
      setActiveDraftId(nextDrafts[nextDrafts.length - 1].id);
    }
  };

  const [customerRole, setCustomerRole] = useState<"customer" | "shipper" | "broker">("customer");

  const applyQuotationToForm = useCallback(
    (q: Quotation) => {
      const cust =
        q.customer?.name ||
        customers.find((c) => String(c.id) === String(q.customer_id))?.name ||
        "Customer";
      const orig =
        q.origin_location?.name ||
        locations.find((l) => l.id === q.origin_location_id)?.name ||
        "Origin Port";
      const dest =
        q.destination_location?.name ||
        locations.find((l) => l.id === q.destination_location_id)?.name ||
        "Destination";

      setForm((prev) => ({
        ...prev,
        id: q.id,
        freight_request_id: q.freight_request_id,
        quotation_number: q.quotation_number,
        revision: q.revision || 1,
        status: q.status,
        customer_id: String(q.customer_id || ""),
        customer_name: cust,
        attention_name: prev.attention_name || "San Rithea",
        issued_by: "ShipFlow Commercial Desk",
        issued_date: q.created_at ? q.created_at.slice(0, 10) : today,
        valid_until: q.valid_until || validUntilDefault,
        transport_mode: q.transport_mode || "ocean_fcl",
        incoterm: q.incoterm || "CIF",
        commodity: "Garment & Accessories",
        origin_location_id: String(q.origin_location_id || ""),
        origin_name: orig,
        destination_location_id: String(q.destination_location_id || ""),
        destination_name: dest,
        subject_object: `IMPORT-${q.incoterm || "CIF"}-${(q.transport_mode || "FCL").toUpperCase()}//CUSTOMS-CLEARANCE`,
        notes: q.notes || "",
        terms_and_conditions: q.terms_and_conditions || PRESET_SIH_FCL.terms_and_conditions || "",
        line_items:
          q.line_items && q.line_items.length > 0
            ? q.line_items.map((it) => ({
                id: it.id,
                description: it.description,
                category:
                  it.description.toLowerCase().includes("receipt") ||
                  it.description.toLowerCase().includes("lolo") ||
                  it.description.toLowerCase().includes("scan") ||
                  it.charge_type.includes("receipt") ||
                  it.charge_type.includes("port_")
                    ? "pass_through"
                    : "service",
                charge_type: it.charge_type || "handling",
                charge_per: "CTNR",
                quantity: it.quantity,
                unit_price: it.unit_price,
                currency: it.currency || "USD",
              }))
            : PRESET_SIH_FCL.line_items || [],
      }));
    },
    [customers, locations, today, validUntilDefault, setForm],
  );

  // Synchronize state ONCE when opened or target id changes
  const loadedTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !organization) return;

    const targetQuoteId = quotationId || existingQuotation?.id;
    const targetKey = targetQuoteId
      ? `quote-${targetQuoteId}`
      : initialRequestId
      ? `req-${initialRequestId}`
      : "new-quote";

    if (loadedTargetRef.current === targetKey) {
      return; // Already initialized for this target! Do NOT fetch again or overwrite user edits!
    }
    loadedTargetRef.current = targetKey;

    if (targetQuoteId && (!existingQuotation?.line_items || existingQuotation.line_items.length === 0)) {
      api
        .get<{ data: Quotation }>(`${freightRoot(organization.id)}/quotations/${targetQuoteId}`)
        .then((res) => {
          applyQuotationToForm(res.data.data);
        })
        .catch((err) => {
          setError(errorMessage(err));
        });
    } else if (initialRequestId) {
      api
        .get<{ data: {
          id: number;
          customer_id: number;
          customer?: { name: string };
          origin_location_id: number;
          origin_location?: { name: string; city: string };
          destination_location_id: number;
          destination_location?: { name: string; city: string };
          transport_mode: "ocean_fcl" | "ocean_lcl" | "air" | "road" | "multimodal";
          incoterm?: string;
          cargo_description?: string;
          notes?: string;
        } }>(`${freightRoot(organization.id)}/requests/${initialRequestId}`)
        .then((res) => {
          const req = res.data.data;
          const matchedPreset =
            req.transport_mode === "air"
              ? PRESET_AIR_KTI
              : req.transport_mode === "road"
              ? PRESET_ROAD_CROSSBORDER
              : PRESET_SIH_FCL;

          setForm((prev) => ({
            ...prev,
            freight_request_id: req.id,
            customer_id: String(req.customer_id || prev.customer_id),
            customer_name: req.customer?.name || prev.customer_name,
            attention_name: prev.attention_name || "Operations Desk",
            transport_mode: req.transport_mode || prev.transport_mode,
            incoterm: req.incoterm || prev.incoterm,
            commodity: req.cargo_description || prev.commodity,
            origin_location_id: String(req.origin_location_id || defaultOrigin?.id || prev.origin_location_id),
            origin_name: req.origin_location?.name || defaultOrigin?.name || prev.origin_name,
            destination_location_id: String(req.destination_location_id || defaultDest?.id || prev.destination_location_id),
            destination_name: req.destination_location?.name || defaultDest?.name || prev.destination_name,
            subject_object: `IMPORT-${req.incoterm || prev.incoterm || "CIF"}-${(req.transport_mode || prev.transport_mode || "FCL").toUpperCase()}//CUSTOMS-CLEARANCE`,
            notes: req.notes || prev.notes,
            terms_and_conditions: matchedPreset.terms_and_conditions || prev.terms_and_conditions,
            line_items: matchedPreset.line_items ? [...matchedPreset.line_items] : prev.line_items,
          }));
        })
        .catch((err) => {
          setError(errorMessage(err));
        });
    }
  }, [open, organization, quotationId, existingQuotation, initialRequestId, applyQuotationToForm, defaultOrigin, defaultDest, setForm]);

  // Calculate Subtotals in Real Time
  const serviceItems = useMemo(
    () => form.line_items.filter((it) => it.category === "service"),
    [form.line_items],
  );
  const passThroughItems = useMemo(
    () => form.line_items.filter((it) => it.category === "pass_through"),
    [form.line_items],
  );

  const serviceTotal = useMemo(
    () => serviceItems.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)), 0),
    [serviceItems],
  );
  const passThroughTotal = useMemo(
    () => passThroughItems.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)), 0),
    [passThroughItems],
  );
  const grandTotal = serviceTotal + passThroughTotal;

  // Realtime Line Item Modifiers
  const updateLineItem = (index: number, field: keyof QuotationLineItemDraft, value: unknown) => {
    setForm((prev) => {
      const updated = [...prev.line_items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, line_items: updated };
    });
  };

  const addLineItem = (category: "service" | "pass_through" = "service") => {
    setForm((prev) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: category === "service" ? "Local Handling & Delivery" : "Port / Statutory Fee (as per receipt)",
          category,
          charge_type: category === "service" ? "trucking" : "port_lolo",
          charge_per: "CTNR",
          quantity: 1,
          unit_price: 50.0,
          currency: "USD",
        },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  // Apply Industry Preset Template
  const applyPreset = (preset: Partial<QuotationFormState>) => {
    setForm((prev) => ({
      ...prev,
      ...preset,
      line_items: preset.line_items ? [...preset.line_items] : prev.line_items,
    }));
    notify("Quotation pricing template applied!");
  };

  // Save Quotation (Create / Update)
  const handleSaveQuotation = async (newStatus?: "draft" | "sent") => {
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        quotation_number: form.quotation_number.trim(),
        customer_id: Number(form.customer_id) || (customers[0]?.id ? Number(customers[0].id) : 1),
        origin_location_id: Number(form.origin_location_id) || defaultOrigin?.id,
        destination_location_id: Number(form.destination_location_id) || defaultDest?.id,
        transport_mode: form.transport_mode,
        incoterm: form.incoterm,
        currency: "USD",
        status: newStatus || form.status,
        valid_until: form.valid_until || undefined,
        terms_and_conditions: form.terms_and_conditions || undefined,
        notes: form.notes || undefined,
        freight_request_id: form.freight_request_id || undefined,
        line_items: form.line_items.map((it) => ({
          description: it.description.trim() || "Logistics Charge",
          charge_type: it.charge_type,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          currency: "USD",
        })),
      };

      if (form.id) {
        // If status changing to sent
        if (newStatus && newStatus !== form.status) {
          await api.post(
            `${freightRoot(organization.id)}/quotations/${form.id}/status`,
            { status: newStatus },
          );
          setForm((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        const res = await api.post<{ data: Quotation }>(
          `${freightRoot(organization.id)}/quotations`,
          payload,
        );
        setForm((prev) => ({
          ...prev,
          id: res.data.data.id,
          status: (newStatus || res.data.data.status) as QuotationFormState["status"],
        }));
      }

      notify(
        newStatus === "sent"
          ? `Quotation ${form.quotation_number} sent to customer!`
          : `Quotation ${form.quotation_number} saved to system.`,
      );
      if (onSaved) onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Revise Quotation (Create Rev 2, Rev 3)
  const handleRevise = async () => {
    if (!organization || !form.id) return;
    setError(null);
    setRevising(true);

    try {
      const payload: Record<string, unknown> = {
        customer_id: Number(form.customer_id) || Number(customers[0]?.id),
        origin_location_id: Number(form.origin_location_id) || defaultOrigin?.id,
        destination_location_id: Number(form.destination_location_id) || defaultDest?.id,
        transport_mode: form.transport_mode,
        incoterm: form.incoterm,
        currency: "USD",
        status: "draft",
        valid_until: form.valid_until || undefined,
        terms_and_conditions: form.terms_and_conditions || undefined,
        notes: form.notes || undefined,
        freight_request_id: form.freight_request_id || undefined,
        line_items: form.line_items.map((it) => ({
          description: it.description.trim() || "Logistics Charge",
          charge_type: it.charge_type,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          currency: "USD",
        })),
      };

      const res = await api.post<{ data: Quotation }>(
        `${freightRoot(organization.id)}/quotations/${form.id}/revise`,
        payload,
      );

      const createdRev = res.data.data;
      setForm((prev) => ({
        ...prev,
        id: createdRev.id,
        revision: createdRev.revision,
        status: "draft",
      }));

      notify(`Created Revision ${createdRev.revision} for quote!`);
      if (onSaved) onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRevising(false);
    }
  };

  // Customer Decision: Accept / Decline
  const handleCustomerDecision = async (decision: "accepted" | "rejected") => {
    if (!organization || !form.id) return;
    setStatusUpdating(true);
    try {
      await api.post(
        `${freightRoot(organization.id)}/quotations/${form.id}/status`,
        { status: decision },
      );
      setForm((prev) => ({ ...prev, status: decision }));
      notify(
        decision === "accepted"
          ? `Quotation accepted! You can now convert it to a shipment.`
          : `Quotation marked as declined.`,
      );
      if (onSaved) onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  };

  // Browser Print Document
  const handlePrint = () => {
    window.print();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size={isFullscreen ? "full" : "4/5"}
        className={cn(
          "flex flex-col gap-0 border-l border-slate-200 p-0 overflow-hidden shadow-2xl transition-all duration-300 ease-in-out bg-[#F5F6F8]",
          isFullscreen
            ? "!w-[100vw] !max-w-[100vw] !border-l-0"
            : "!w-full lg:!w-[82vw] lg:!max-w-[82vw]",
        )}
        showCloseButton={false}
        aria-label="Quotation Studio Workspace"
      >
        <SheetTitle className="sr-only">Live Quotation Studio</SheetTitle>
        <SheetDescription className="sr-only">
          Realtime interactive quotation form with live printable PDF view.
        </SheetDescription>

        {/* ─── TIER 1: MULTI-DRAFT TAB STRIP & WINDOW CONTROLS (Vektor TMS Layout) ─ */}
        <div className="flex shrink-0 items-end justify-between border-b border-slate-200/90 bg-[#EDF0F5] px-3 pt-2 select-none overflow-hidden">
          {/* Horizontal Quote Draft Tabs (Browser-style, zero scrollbar in header) */}
          <div className="flex min-w-0 flex-1 items-end gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {drafts.map((d) => {
              const isActive = d.id === activeDraft.id;
              const origCity =
                locations.find((l) => String(l.id) === d.form.origin_location_id)?.city ||
                d.form.origin_name?.split("(")[0]?.trim() ||
                "Origin";
              const destCity =
                locations.find((l) => String(l.id) === d.form.destination_location_id)?.city ||
                d.form.destination_name?.split("(")[0]?.trim() ||
                "Destination";

              return (
                <div
                  key={d.id}
                  onClick={() => setActiveDraftId(d.id)}
                  className={`group relative flex h-10 min-w-44 max-w-64 cursor-pointer items-center rounded-t-lg border border-b-0 px-3 transition-all ${
                    isActive
                      ? "border-slate-200 border-t-2 border-t-blue-600 bg-white font-semibold text-slate-900 shadow-2xs z-10 -mb-px"
                      : "border-transparent bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <FileText
                    size={13}
                    className={`shrink-0 mr-2 ${
                      isActive ? "text-blue-600" : "text-teal-600 group-hover:text-slate-700"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold leading-tight">
                      {d.label}
                    </span>
                    <span className="block truncate text-[10px] font-normal text-slate-500 leading-tight">
                      {origCity} → {destCity}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => closeDraftTab(d.id, e)}
                    aria-label={`Close ${d.label}`}
                    className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {/* Add Quote Comparison Tab Button (+) */}
            <button
              type="button"
              onClick={addDraftTab}
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 shadow-2xs transition-colors mb-1.5"
              title="Add another quotation draft"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Right Window Controls (matching Vektor TMS: Fullscreen, Clear all, Close) */}
          <div className="flex shrink-0 items-center gap-1 pb-1.5 pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 gap-1.5 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              title={isFullscreen ? "Exit Fullscreen (Standard drawer)" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => closeDraftTab(activeDraft.id)}
              className="h-7 gap-1.5 px-2 text-xs text-slate-600 hover:text-red-700 hover:bg-red-50/70"
              title="Reset current quote"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear all</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 gap-1 px-2 text-xs text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              aria-label="Close"
            >
              <X size={14} />
              <span>Close</span>
            </Button>
          </div>
        </div>

        {/* ─── TIER 2: SUB-HEADER COMMERCIAL ACTION BAR (Vektor TMS Layout) ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 select-none overflow-hidden">
          {/* Left: Submit all / Quote info */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveQuotation()}
              disabled={saving}
              className="h-8 gap-1.5 text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium rounded-lg shadow-2xs"
            >
              <Check size={13} className="text-blue-600" />
              <span>Submit all</span>
            </Button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                {form.quotation_number}
              </span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-900">
                REV {form.revision}
              </span>
              <Badge
                variant={
                  form.status === "accepted"
                    ? "secondary"
                    : form.status === "sent"
                    ? "default"
                    : "outline"
                }
                className={`capitalize text-[10px] h-5 ${
                  form.status === "accepted"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : form.status === "sent"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : ""
                }`}
              >
                {form.status}
              </Badge>
              <span className="text-xs text-slate-400 hidden sm:inline">·</span>
              <span className="text-xs font-medium text-slate-700 truncate max-w-56 hidden sm:inline">
                {form.customer_name}
              </span>
            </div>
          </div>

          {/* Right: Autosave status & Actions */}
          <div className="flex items-center gap-3">
            {/* Auto-saved status indicator */}
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Check size={13} className="text-emerald-600" />
              <span>{saving ? "Saving..." : "Saved"}</span>
            </div>

            {/* Delete draft */}
            <button
              type="button"
              onClick={() => closeDraftTab(activeDraft.id)}
              className="text-xs text-slate-600 hover:text-red-600 font-medium transition-colors hidden sm:inline"
            >
              Delete draft
            </button>

            {/* Print / PDF Export */}
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 gap-1.5 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs hidden sm:flex"
              title="Print or Save as Official PDF"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </Button>

            {/* Primary Action Button */}
            {form.status === "draft" && (
              <Button
                size="sm"
                onClick={() => handleSaveQuotation("sent")}
                disabled={saving}
                className="h-8 gap-1.5 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs rounded-lg"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Send to Client (Rev {form.revision})</span>
              </Button>
            )}

            {form.status === "sent" && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCustomerDecision("rejected")}
                  disabled={statusUpdating}
                  className="h-8 gap-1.5 px-2.5 text-xs border-red-300 text-red-800 hover:bg-red-50 rounded-lg"
                >
                  {statusUpdating ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                  <span>Client Declined</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCustomerDecision("accepted")}
                  disabled={statusUpdating}
                  className="h-8 gap-1.5 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs rounded-lg"
                >
                  {statusUpdating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Client Accepted</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevise}
                  disabled={revising}
                  className="h-8 gap-1.5 px-2.5 text-xs border-amber-300 text-amber-900 hover:bg-amber-50 rounded-lg"
                >
                  {revising ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  <span>Create Rev {form.revision + 1}</span>
                </Button>
              </div>
            )}

            {form.status === "accepted" && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/freight/shipments?create=true&customer_id=${form.customer_id}`);
                  }}
                  className="h-8 gap-1.5 px-4 text-xs bg-purple-700 hover:bg-purple-800 text-white font-semibold shadow-2xs rounded-lg"
                >
                  <Ship size={13} />
                  <span>Book Shipment</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevise}
                  disabled={revising}
                  className="h-8 gap-1.5 px-3 text-xs border-slate-300 rounded-lg"
                >
                  <RotateCcw size={13} />
                  <span>Revise Quote</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ─── SPLIT VIEW BODY (50% FORM / 50% REALTIME PDF PREVIEW) ─ */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          
          {/* ═════════════════════════════════════════════════════════ */}
          {/* LEFT: Quotation Builder Form & Presets                    */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="h-full overflow-y-auto custom-scrollbar bg-[#F5F6F8] p-3 sm:p-5 space-y-4">
            
            {/* Vektor-Style Notification & Smart Extraction Ribbon */}
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-5 items-center justify-center rounded bg-blue-600 text-white font-bold text-[10px] shrink-0 shadow-2xs">
                  AI
                </span>
                <span className="font-semibold text-blue-950 truncate">
                  {referencePdfName ? `Extracted from ${referencePdfName}` : `${form.line_items.length} fields priced from inquiry`}
                </span>
                <span className="text-slate-400 hidden sm:inline">·</span>
                <span className="text-slate-600 hidden sm:inline text-[11px]">
                  Subtotal: <strong>${serviceTotal.toFixed(2)}</strong> + Receipts: <strong>${passThroughTotal.toFixed(2)}</strong>
                </span>
                <span className="text-slate-400 hidden md:inline">·</span>
                <span className="text-slate-500 hidden md:inline text-[11px]">Read a minute ago</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => applyPreset(PRESET_SIH_FCL)}
                  className="h-7 px-2.5 text-[11px] font-semibold text-blue-900 bg-white border-blue-300 hover:bg-blue-50 shadow-2xs rounded-md"
                >
                  Next to check
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-900 border border-blue-300 hover:bg-blue-50 transition-colors shadow-2xs"
                    >
                      <span>Review</span>
                      <ChevronDown size={11} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuLabel className="text-[10px] text-slate-500 uppercase font-bold">Cambodian Rate Presets</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => applyPreset(PRESET_SIH_FCL)} className="cursor-pointer">
                      ⚡ Sihanoukville Port FCL (PAS)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyPreset(PRESET_PNH_FCL)} className="cursor-pointer">
                      ⚡ Phnom Penh Port LM17 FCL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyPreset(PRESET_AIR_KTI)} className="cursor-pointer">
                      ⚡ Air Cargo KTI Airport
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyPreset(PRESET_ROAD_CROSSBORDER)} className="cursor-pointer">
                      ⚡ Cross-Border Road (VN ➔ KH)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, line_items: [] }));
                    notify("Cleared line items");
                  }}
                  className="text-[11px] text-slate-500 hover:text-red-700 px-1 py-1 hover:underline font-medium"
                >
                  Undo fill
                </button>
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset(PRESET_SIH_FCL)}
                className="rounded-md border border-blue-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-900 hover:bg-blue-50 transition-colors shadow-2xs"
              >
                PAS Sihanoukville FCL
              </button>
              <button
                type="button"
                onClick={() => applyPreset(PRESET_PNH_FCL)}
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                PPAP Phnom Penh LM17
              </button>
              <button
                type="button"
                onClick={() => applyPreset(PRESET_AIR_KTI)}
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                KTI Airport Air
              </button>
              <button
                type="button"
                onClick={() => applyPreset(PRESET_ROAD_CROSSBORDER)}
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                VN-KH Cross-Border
              </button>
            </div>

            {/* Card 1: Client Section (Matching Vektor TMS 'Client' Card Layout) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700 font-bold shrink-0">
                    <Building2 size={15} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Client
                  </h3>
                </div>

                {/* Vektor-style segmented role pills: Broker vs Customer */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCustomerRole("broker")}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      customerRole === "broker"
                        ? "bg-blue-600 text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Briefcase size={12} />
                    <span>Broker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerRole("customer")}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      customerRole === "customer"
                        ? "bg-blue-600 text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users size={12} />
                    <span>Customer</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Quotation Number Field (Editable!) */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Quotation No. *</Label>
                  <Input
                    value={form.quotation_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, quotation_number: e.target.value }))}
                    placeholder="e.g. QUO-2026-0001"
                    className="mt-1 h-9 bg-white text-xs font-mono font-bold text-slate-900 border-slate-300 focus:border-blue-500"
                  />
                </div>

                {/* Reference Field (Matching Vektor TMS 'Reference') */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Reference / Inquiry No.</Label>
                  <Input
                    value={form.subject_object}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject_object: e.target.value }))}
                    placeholder="e.g. CPL0534707"
                    className="mt-1 h-9 bg-white text-xs font-mono"
                  />
                </div>

                {/* Broker / Customer Field with (+) Quick Add Button */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">
                    {customerRole === "broker" ? "Broker / Counterparty *" : "Customer / B2B Shipper *"}
                  </Label>
                  <div className="relative mt-1">
                    <Select
                      value={form.customer_id}
                      onValueChange={(val) => {
                        const selected = customers.find((c) => String(c.id) === val);
                        setForm((prev) => ({
                          ...prev,
                          customer_id: val,
                          customer_name: selected?.name || prev.customer_name,
                        }));
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs pr-8">
                        <SelectValue placeholder={customerRole === "broker" ? "Select broker..." : "Select customer..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => router.push("/network/customers?create=true")}
                      title="Add new counterparty"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Attention Person */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Attention (Attn) Contact</Label>
                  <Input
                    value={form.attention_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, attention_name: e.target.value }))}
                    placeholder="e.g. San Rithea"
                    className="mt-1 h-9 bg-white text-xs"
                  />
                </div>

                {/* Commodity */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Commodity</Label>
                  <Input
                    value={form.commodity}
                    onChange={(e) => setForm((prev) => ({ ...prev, commodity: e.target.value }))}
                    placeholder="e.g. Garments & Apparel"
                    className="mt-1 h-9 bg-white text-xs"
                  />
                </div>

                {/* Incoterm */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Trade Incoterm</Label>
                  <Select
                    value={form.incoterm}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, incoterm: val }))}
                  >
                    <SelectTrigger className="mt-1 h-9 bg-white text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["CIF", "FOB", "EXW", "FCA", "DDP", "DAP", "CFR", "CPT", "CIP"].map((term) => (
                        <SelectItem key={term} value={term} className="text-xs font-mono">
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origin Location */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Origin Port / Terminal</Label>
                  <Select
                    value={form.origin_location_id}
                    onValueChange={(val) => {
                      const found = locations.find((l) => String(l.id) === val);
                      setForm((prev) => ({
                        ...prev,
                        origin_location_id: val,
                        origin_name: found ? found.name : prev.origin_name,
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1 h-9 bg-white text-xs">
                      <SelectValue placeholder="Select origin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                          {l.name} ({l.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination Location */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Destination Delivery Point</Label>
                  <Select
                    value={form.destination_location_id}
                    onValueChange={(val) => {
                      const found = locations.find((l) => String(l.id) === val);
                      setForm((prev) => ({
                        ...prev,
                        destination_location_id: val,
                        destination_name: found ? found.name : prev.destination_name,
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1 h-9 bg-white text-xs">
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                          {l.name} ({l.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mode & Validity */}
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Transport Mode</Label>
                  <Select
                    value={form.transport_mode}
                    onValueChange={(val: QuotationFormState["transport_mode"]) =>
                      setForm((prev) => ({ ...prev, transport_mode: val }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 bg-white text-xs capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocean_fcl" className="text-xs">Ocean Freight FCL</SelectItem>
                      <SelectItem value="ocean_lcl" className="text-xs">Ocean Freight LCL</SelectItem>
                      <SelectItem value="air" className="text-xs">Air Cargo</SelectItem>
                      <SelectItem value="road" className="text-xs">Road Haulage</SelectItem>
                      <SelectItem value="multimodal" className="text-xs">Multimodal Transit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Quotation Valid Until</Label>
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm((prev) => ({ ...prev, valid_until: e.target.value }))}
                    className="mt-1 h-9 bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Interactive Line Items (Local Charges & Pass-Through) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Pricing Line Items & Tariffs
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Realtime calculation updates the formal PDF on the right
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLineItem("service")}
                    className="h-7 text-xs px-2 gap-1 text-blue-900 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                  >
                    <Plus size={12} /> Local Fee
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLineItem("pass_through")}
                    className="h-7 text-xs px-2 gap-1 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={12} /> Port Fee
                  </Button>
                </div>
              </div>

              {/* Items List - Single unified container wrapping all fields (no individual grey card boxes) */}
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {/* Column Subheaders */}
                <div className="hidden sm:flex items-center gap-2.5 bg-slate-50/90 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                  <span className="w-16 shrink-0">Category</span>
                  <span className="flex-1 min-w-44">Charge Description</span>
                  <span className="w-20 shrink-0">Unit</span>
                  <span className="w-16 shrink-0 text-right">Qty</span>
                  <span className="w-24 shrink-0 text-right">Unit Rate</span>
                  <span className="w-7 shrink-0"></span>
                </div>

                {/* Line Item Rows */}
                <div className="divide-y divide-slate-100">
                  {form.line_items.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Category pill */}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase shrink-0 w-16 text-center ${
                          item.category === "service"
                            ? "bg-blue-100 text-blue-900"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {item.category === "service" ? "Service" : "Receipt"}
                      </span>

                      {/* Description */}
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        placeholder="Charge description"
                        className="h-8 flex-1 min-w-44 bg-white text-xs font-medium text-slate-900"
                      />

                      {/* Charge Per Unit */}
                      <Select
                        value={item.charge_per || "CTNR"}
                        onValueChange={(val) => updateLineItem(index, "charge_per", val)}
                      >
                        <SelectTrigger className="h-8 w-20 bg-white text-xs font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["CTNR", "SHPT", "SET", "CBM", "TRIP", "KG"].map((u) => (
                            <SelectItem key={u} value={u} className="text-xs font-mono">
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Quantity */}
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                        className="h-8 w-16 bg-white text-xs text-right font-mono"
                      />

                      {/* Price */}
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, "unit_price", e.target.value)}
                          className="h-8 pl-5 pr-2 bg-white text-xs text-right font-mono font-semibold"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors w-7 flex justify-center shrink-0"
                        title="Remove charge"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {form.line_items.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No line items yet. Click &quot;+ Local Fee&quot; or &quot;+ Port Fee&quot; above to add tariffs.
                    </div>
                  )}
                </div>
              </div>

              {/* Running Totals Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 p-2.5 font-mono text-xs">
                <div className="space-x-3 text-slate-600">
                  <span>
                    Services: <strong>${serviceTotal.toFixed(2)}</strong>
                  </span>
                  <span>
                    Receipt Fees: <strong>${passThroughTotal.toFixed(2)}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-sans text-[11px] mr-2">Grand Total:</span>
                  <span className="text-base font-bold text-blue-950 font-mono">
                    ${grandTotal.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Special Notes & Surcharges */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Special Terms, Exceptions & Demurrage Notes
              </h3>
              <Textarea
                rows={4}
                value={form.terms_and_conditions}
                onChange={(e) => setForm((prev) => ({ ...prev, terms_and_conditions: e.target.value }))}
                placeholder="Special notes, free detention days, fuel clause, inspection charges..."
                className="text-xs bg-white leading-relaxed font-mono text-slate-700"
              />
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* RIGHT: Realtime Live A4 PDF Sheet & Embed PDF Viewer      */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="flex h-full flex-col overflow-hidden bg-slate-200/80">
            {/* Hidden file input for reference PDF upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePdfUpload(e.target.files[0]);
                }
              }}
            />

            {/* Header Toolbar matching Vektor TMS Right Document Panel */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Red PDF File Icon (matching Vektor TMS PDF header icon) */}
                <div className="flex size-6 items-center justify-center rounded bg-red-50 text-red-600 shrink-0">
                  <FileText size={14} />
                </div>

                {/* Document File Name */}
                <span className="font-semibold text-xs text-slate-900 truncate max-w-44 sm:max-w-64" title={referencePdfName || `${form.quotation_number}-Official-Quotation.pdf`}>
                  {referencePdfName || `${form.quotation_number}-Official-Quotation.pdf`}
                </span>

                {/* View Mode Toggle: Live A4 Sheet vs. Embed PDF Viewer */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => setPdfViewMode("a4")}
                    className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                      pdfViewMode === "a4"
                        ? "bg-white text-blue-950 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Live A4 Quote</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfViewMode("reference")}
                    className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                      pdfViewMode === "reference"
                        ? "bg-white text-blue-950 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Embed PDF</span>
                  </button>
                </div>

                {pdfViewMode === "a4" && (
                  <span className="hidden xl:flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 shrink-0">
                    <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Live Synced
                  </span>
                )}
              </div>

              {/* Right Toolbar Controls (Download, Refresh, Delete, Zoom) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {pdfViewMode === "a4" && (
                  <div className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 p-0.5 mr-1">
                    <button
                      type="button"
                      onClick={() => setZoomScale((z) => Math.max(60, z - 10))}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded"
                      title="Zoom Out"
                    >
                      <ZoomOut size={12} />
                    </button>
                    <span className="px-1 font-mono text-[10px] text-slate-600">{zoomScale}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomScale((z) => Math.min(140, z + 10))}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded"
                      title="Zoom In"
                    >
                      <ZoomIn size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(100)}
                      className="px-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900"
                      title="Reset Zoom"
                    >
                      100%
                    </button>
                  </div>
                )}

                {/* Vektor TMS Document Header Icons: Download, Refresh, Delete */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Download / Print PDF"
                >
                  <Download size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => notify("Quotation preview refreshed.")}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Refresh Document Preview"
                >
                  <RotateCcw size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReferencePdfUrl(null);
                    setReferencePdfName(null);
                    setPdfViewMode("a4");
                    notify("Cleared reference document.");
                  }}
                  className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Clear Reference File"
                >
                  <Trash2 size={14} />
                </button>

                {pdfViewMode === "reference" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-[11px] px-2 gap-1 text-slate-700 bg-slate-50 hover:bg-slate-100 ml-1"
                  >
                    <FileUp size={12} />
                    <span className="hidden sm:inline">{referencePdfUrl ? "Replace" : "Upload"}</span>
                  </Button>
                )}

                {referencePdfUrl && (
                  <a
                    href={referencePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Open in new window"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Panel Content: Either Live A4 Sheet OR Native Embed PDF Viewer */}
            {pdfViewMode === "a4" ? (
              /* Scrollable Container with White A4 Canvas */
              <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6 flex justify-center">
                {/* ─────────────────────────────────────────────────── */}
                {/* THE AUTHENTIC A4 QUOTATION SHEET                    */}
                {/* ─────────────────────────────────────────────────── */}
                <div
                  id="quotation-print-area"
                  className="w-full max-w-[760px] bg-white shadow-xl border border-slate-300 p-8 text-slate-900 font-sans transition-all duration-150 rounded-xs select-text"
                  style={{
                    transform: `scale(${zoomScale / 100})`,
                    transformOrigin: "top center",
                  }}
                >
                  {/* 1. Official Letterhead & Brand */}
                  <div className="flex items-center justify-between border-b-2 border-blue-950 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-blue-950 text-white font-bold text-xl shadow-xs">
                        <Ship size={24} />
                      </div>
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-blue-950 uppercase leading-none">
                          ShipFlow Logistics (Cambodia) Co., Ltd.
                        </h1>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
                          Building C.7 Fortune Tower Office Room 1501, St. Oknha Tephan, Sangkat Veal Vong,
                          Khan 7Makara, Phnom Penh, Cambodia
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Tel: (855) 23 23 15 23 / 69 518 168 · Email: quotes@shipflow.asia
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded bg-blue-950 px-2.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                        Official Quote
                      </span>
                      <p className="font-mono text-xs font-bold text-blue-950 mt-1">
                        {form.quotation_number}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono font-medium">
                        REV: 0{form.revision}
                      </p>
                    </div>
                  </div>

                  {/* 2. Quotation Title */}
                  <div className="text-center py-2.5">
                    <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-200 inline-block px-8 pb-0.5">
                      Freight Quotation / 报价单
                    </h2>
                  </div>

                  {/* 3. Customer & Shipment Metadata Box */}
                  <div className="rounded border border-slate-300 bg-slate-50/70 p-3 text-xs grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Customer:</span>{" "}
                      <span className="font-bold text-slate-900">{form.customer_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Quotation No:</span>{" "}
                      <span className="font-mono font-bold text-blue-950">{form.quotation_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Attn:</span>{" "}
                      <span className="font-medium text-slate-800">{form.attention_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Issued Date:</span>{" "}
                      <span className="font-mono text-slate-800">{form.issued_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Incoterm:</span>{" "}
                      <span className="font-mono font-bold text-blue-900">{form.incoterm}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Valid Until:</span>{" "}
                      <span className="font-mono font-semibold text-red-700">
                        {form.valid_until || "Until Further Notice"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Commodity:</span>{" "}
                      <span className="font-medium text-slate-800">{form.commodity}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Mode:</span>{" "}
                      <span className="capitalize font-semibold text-slate-800">
                        {form.transport_mode.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Routing:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {form.origin_name} ➔ {form.destination_name}
                      </span>
                    </div>
                  </div>

                  {/* 4. Table 1: Local Charges */}
                  <div className="mb-3">
                    <div className="bg-slate-200/80 px-2 py-1 text-[11px] font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center">
                      <span>I. Local Logistics & Clearance Charges</span>
                      <span className="text-[10px] font-normal text-slate-500">Service Items</span>
                    </div>
                    <table className="w-full border-collapse text-left text-xs border border-t-0 border-slate-300">
                      <thead>
                        <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-600 uppercase">
                          <th className="py-1 px-2 w-8 text-center">No.</th>
                          <th className="py-1 px-2">Descriptions</th>
                          <th className="py-1 px-2 w-20 text-center">Unit</th>
                          <th className="py-1 px-2 w-16 text-center">Cur</th>
                          <th className="py-1 px-2 w-24 text-right">Unit Rate</th>
                          <th className="py-1 px-2 w-24 text-right">Total (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {serviceItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-1 px-2 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-2 font-medium text-slate-900">{item.description}</td>
                            <td className="py-1 px-2 text-center text-slate-600 font-mono text-[11px]">
                              {item.charge_per || "CTNR"}
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-[11px]">USD</td>
                            <td className="py-1 px-2 text-right font-mono text-[11px]">
                              ${(Number(item.unit_price) || 0).toFixed(2)}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-semibold text-slate-900">
                              ${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {serviceItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-2 text-center text-slate-400 italic">
                              No local service items added
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-[11px]">
                          <td colSpan={5} className="py-1 px-2 text-right text-slate-700">
                            Subtotal Local Charges:
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-blue-950 font-bold">
                            ${serviceTotal.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 5. Table 2: Charges as per receipt (Pass-Through) */}
                  {passThroughItems.length > 0 && (
                    <div className="mb-3">
                      <div className="bg-amber-100/70 px-2 py-1 text-[11px] font-bold text-amber-950 uppercase tracking-wider flex justify-between items-center border border-amber-200 border-b-0">
                        <span>II. Charges As Per Official Receipt (代收代付)</span>
                        <span className="text-[10px] font-normal text-amber-800">Pass-Through Receipts</span>
                      </div>
                      <table className="w-full border-collapse text-left text-xs border border-slate-300">
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-600 uppercase">
                            <th className="py-1 px-2 w-8 text-center">No.</th>
                            <th className="py-1 px-2">Descriptions (Receipt Provided)</th>
                            <th className="py-1 px-2 w-20 text-center">Unit</th>
                            <th className="py-1 px-2 w-16 text-center">Cur</th>
                            <th className="py-1 px-2 w-24 text-right">Unit Rate</th>
                            <th className="py-1 px-2 w-24 text-right">Total (USD)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {passThroughItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-1 px-2 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-1 px-2 font-medium text-slate-900">{item.description}</td>
                              <td className="py-1 px-2 text-center text-slate-600 font-mono text-[11px]">
                                {item.charge_per || "CTNR"}
                              </td>
                              <td className="py-1 px-2 text-center font-mono text-[11px]">USD</td>
                              <td className="py-1 px-2 text-right font-mono text-[11px]">
                                ${(Number(item.unit_price) || 0).toFixed(2)}
                              </td>
                              <td className="py-1 px-2 text-right font-mono font-semibold text-slate-900">
                                ${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-[11px]">
                            <td colSpan={5} className="py-1 px-2 text-right text-slate-700">
                              Subtotal Receipt Items:
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-amber-950 font-bold">
                              ${passThroughTotal.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* 6. Grand Total Banner */}
                  <div className="flex items-center justify-between border-2 border-blue-950 bg-blue-50/60 p-2.5 my-3">
                    <div>
                      <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                        Total Estimated Quotation:
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Subject to final container weights & customs verification
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-black text-blue-950">
                        ${grandTotal.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-blue-900 ml-1">USD</span>
                    </div>
                  </div>

                  {/* 7. Special Terms & Conditions Note */}
                  <div className="border border-slate-300 rounded p-2.5 text-[10px] text-slate-700 space-y-1 mb-4">
                    <span className="font-bold uppercase text-slate-900 block border-b border-slate-200 pb-0.5">
                      Special Notes / Terms & Conditions:
                    </span>
                    <div className="whitespace-pre-line leading-relaxed font-mono text-[9px] text-slate-600">
                      {form.terms_and_conditions || "- All rates subject to carrier space & equipment availability.\n- VAT 10% applied as per law.\n- Standard Cambodian logistics trading terms apply."}
                    </div>
                  </div>

                  {/* 8. Signature & Acceptance Box */}
                  <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-300 text-xs">
                    <div className="space-y-8">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Issued by (ShipFlow Logistics):
                      </span>
                      <div className="border-b border-slate-400 w-44 pt-4">
                        <span className="font-bold text-slate-900 text-[11px]">{form.issued_by}</span>
                      </div>
                    </div>
                    <div className="space-y-8 text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Customer Acceptance / 客户确认:
                      </span>
                      <div className="border-b border-slate-400 w-44 ml-auto pt-4 text-center text-slate-400 text-[10px]">
                        Signature & Company Stamp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : referencePdfUrl ? (
              /* Native Embedded PDF Viewer */
              <div className="flex-1 w-full h-full p-2 bg-slate-900/90 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-xs text-slate-200 pb-1.5 px-1 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="inline-block size-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-semibold truncate">{referencePdfName}</span>
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Native PDF Embed</span>
                  </div>
                </div>
                <div className="flex-1 w-full h-full rounded-md overflow-hidden bg-white shadow-xl border border-slate-700">
                  <embed
                    src={`${referencePdfUrl}#toolbar=1&navpanes=1`}
                    type="application/pdf"
                    className="size-full border-0"
                  />
                </div>
              </div>
            ) : (
              /* Drag-and-drop / Upload Zone for Reference PDF */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 flex flex-col items-center justify-center m-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center p-8 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-900 mb-3 shadow-2xs">
                  <FileUp size={28} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Embed Customer Quotation or Reference PDF
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Drag and drop any PDF file (Customer Inquiry, Shipper Packing List, Carrier Rate Card, B/L) to inspect side-by-side in the native embedded PDF viewer.
                </p>
                <Button size="sm" variant="outline" className="mt-4 gap-1.5 text-xs bg-white text-blue-950 font-semibold border-slate-300">
                  <FileUp size={13} />
                  <span>Browse PDF File</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Global Print Style for Native Clean A4 Printing */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #quotation-print-area, #quotation-print-area * {
              visibility: visible !important;
            }
            #quotation-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 24px !important;
              border: none !important;
              box-shadow: none !important;
              transform: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
          }
        `}} />
      </SheetContent>
    </Sheet>
  );
}
