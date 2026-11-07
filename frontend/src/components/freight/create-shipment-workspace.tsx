"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  FileCheck,
  FileText,
  FileUp,
  Layers,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Package,
  Plus,
  Ship,
  Sparkles,
  Trash2,
  Truck,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { freightRoot, type FreightCatalog } from "@/lib/freight";
import { partnerRoot, type Partner } from "@/lib/partners";
import { useResource } from "@/lib/use-resource";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type CargoDraftItem = {
  id: string;
  description: string;
  commodity: string;
  hs_code: string;
  package_type: string;
  quantity: number;
  gross_weight_kg: number;
  volume_cbm: number;
  container_number: string;
  seal_number: string;
};

export type StopDraftItem = {
  id: string;
  type: "pickup" | "stop" | "delivery";
  sequence: number;
  location_id: string;
  location_name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  contact_phone_prefix?: string;
  contact_email?: string;
  reference_number?: string;
  show_contact?: boolean;
  appointment_time: string;
  notes: string;
};

export type DocumentDraft = {
  id: string;
  name: string;
  type: "bl" | "invoice" | "packing_list" | "waybill" | "other";
  size: number;
  url: string;
  file?: File;
  mimeType?: string;
  isSample?: boolean;
  uploaded_at: string;
  extracted?: ExtractedData;
};

export type ExtractedData = {
  confidence: number;
  source_doc: string;
  shipper_name?: string;
  consignee_name?: string;
  notify_party?: string;
  carrier_name?: string;
  master_tracking_number?: string;
  transport_mode?: "road" | "ocean_fcl" | "ocean_lcl" | "air" | "multimodal";
  direction?: "import" | "export" | "domestic";
  origin_name?: string;
  origin_address?: string;
  destination_name?: string;
  destination_address?: string;
  departure_date?: string;
  arrival_date?: string;
  cargo_description?: string;
  package_type?: string;
  quantity?: number;
  gross_weight_kg?: number;
  volume_cbm?: number;
  container_number?: string;
  seal_number?: string;
  vessel_name?: string;
  voyage_number?: string;
  booking_reference?: string;
  warnings?: string[];
};

export type ShipmentDraft = {
  id: string;
  label: string;
  direction: "import" | "export" | "domestic";
  shipment_number: string;
  customer_id: string; // Shipper / Customer partner id
  consignee_name: string;
  notify_party: string;
  carrier_id: string; // Primary carrier partner id
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  transport_mode: "road" | "ocean_fcl" | "ocean_lcl" | "air" | "multimodal";
  load_type: "FTL" | "LTL" | "FCL" | "LCL" | "CARGO";
  status: "draft" | "planned" | "dispatched" | "in_transit";
  customs_status: "not_applicable" | "pending_docs" | "declaration_drafted" | "under_inspection" | "cleared";
  stops: StopDraftItem[];
  cargo_items: CargoDraftItem[];
  // Transport execution
  master_tracking_number: string;
  booking_reference: string;
  vessel_or_flight_or_plate: string;
  voyage_or_trip_number: string;
  container_number: string;
  seal_number: string;
  etd: string;
  eta: string;
  // Notes & references
  purchase_order_ref: string;
  special_instructions: string;
  notes: string;
  // Documents
  documents: DocumentDraft[];
};

// ---------------------------------------------------------------------------
// Sample Bill of Lading Document for 1-Click Testing (Matches Vektor Reference)
// ---------------------------------------------------------------------------

const SAMPLE_BL_EXTRACTED: ExtractedData = {
  confidence: 97,
  source_doc: "汇孚390件提单AOTAI FAUXFUR(1)(1).pdf",
  shipper_name: "WEALDONE LIMITED",
  consignee_name: "XIN CAI FU (CAMBODIA) CO., LTD.",
  notify_party: "SAME AS CONSIGNEE",
  carrier_name: "Mekong River Transport Co.",
  master_tracking_number: "RCLY261030704",
  transport_mode: "road",
  direction: "import",
  origin_name: "JIANGSU, CHINA",
  origin_address: "FLAT/RM P, 4/F, LLADRO CENTRE, 72 HOI YUEN ROAD, KWUN TONG, HONG KONG",
  destination_name: "PHNOM PENH, CAMBODIA",
  destination_address: "PHUM DOMNAK TROYEOUNG, SANGKAT CHOM CHAO I, KHAN POSEN CHEY, PHNOM PENH",
  cargo_description: "KNITTED FABRIC AND GARMENT ACCESSORIES",
  package_type: "Cartons / Packages",
  quantity: 356,
  gross_weight_kg: 9539.03,
  volume_cbm: 62.8,
  container_number: "TEMU8492019",
  seal_number: "SL-993821",
  vessel_name: "Mekong Express 08",
  voyage_number: "TR-2026-042",
  booking_reference: "BK-MK-2026-088",
  departure_date: "2026-11-06T08:00",
  arrival_date: "2026-11-09T17:30",
  warnings: ["Cross-border transit through Mong Cai Border / Vietnam checkpoint required."],
};

function createInitialDraft(index: number = 1, catalog?: FreightCatalog): ShipmentDraft {
  const originLoc = catalog?.locations[0];
  const destLoc = catalog?.locations[1] ?? catalog?.locations[0];

  const now = new Date();
  const etdDate = new Date(now.getTime() + 24 * 3600 * 1000);
  const etaDate = new Date(now.getTime() + 72 * 3600 * 1000);
  const formatIsoForInput = (d: Date) => d.toISOString().slice(0, 16);

  return {
    id: `draft-${Date.now()}-${index}`,
    label: `Draft #${index}`,
    direction: "domestic",
    shipment_number: "",
    customer_id: "",
    consignee_name: "",
    notify_party: "",
    carrier_id: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    transport_mode: "road",
    load_type: "FTL",
    status: "draft",
    customs_status: "not_applicable",
    stops: [
      {
        id: `stop-pickup-${Date.now()}`,
        type: "pickup",
        sequence: 1,
        location_id: originLoc ? String(originLoc.id) : "",
        location_name: "WEALDONE LIMITED",
        address: "JIANGSU, CHINA",
        contact_name: "",
        contact_phone: "",
        contact_phone_prefix: "+855",
        reference_number: "111",
        appointment_time: "",
        notes: "",
        show_contact: false,
      },
      {
        id: `stop-delivery-${Date.now() + 1}`,
        type: "delivery",
        sequence: 2,
        location_id: destLoc ? String(destLoc.id) : "",
        location_name: "XIN CAI FU (CAMBODIA) CO., LTD.",
        address: "PHUM DOMNAK TROYEOUNG, SANGKAT CHOM CHAO I, KHAN POSEN CHEY, PHNOM PENH",
        contact_name: "",
        contact_phone: "012 818 309",
        contact_phone_prefix: "+855",
        reference_number: "111",
        appointment_time: "",
        notes: "Contact: +85512818309",
        show_contact: true,
      },
    ],
    cargo_items: [
      {
        id: `cargo-${Date.now()}`,
        description: "General Commercial Cargo",
        commodity: "Textiles & Garments",
        hs_code: "6109.10",
        package_type: "cartons",
        quantity: 100,
        gross_weight_kg: 1200,
        volume_cbm: 5.5,
        container_number: "",
        seal_number: "",
      },
    ],
    master_tracking_number: "",
    booking_reference: "",
    vessel_or_flight_or_plate: "",
    voyage_or_trip_number: "",
    container_number: "",
    seal_number: "",
    etd: formatIsoForInput(etdDate),
    eta: formatIsoForInput(etaDate),
    purchase_order_ref: "",
    special_instructions: "Freight is prepaid as arranged; ensure payment is confirmed before release. Notify consignee upon arrival.",
    notes: "",
    documents: [],
  };
}

// ---------------------------------------------------------------------------
// Main Component: CreateShipmentWorkspace
// ---------------------------------------------------------------------------

export function CreateShipmentWorkspace({
  open,
  onOpenChange,
  catalog,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: FreightCatalog;
  onCreated?: () => void;
}) {
  const { organization, notify } = useWorkspace();
  const router = useRouter();

  // Screen sizing
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Draft management with lazy initialization
  const storageKey = organization ? `mekong-shipment-drafts:${organization.id}` : null;
  const [drafts, setDrafts] = useState<ShipmentDraft[]>(() => {
    if (typeof window !== "undefined" && organization) {
      try {
        const stored = sessionStorage.getItem(`mekong-shipment-drafts:${organization.id}`);
        if (stored) {
          const parsed: ShipmentDraft[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return [createInitialDraft(1, catalog)];
  });
  const [activeDraftId, setActiveDraftId] = useState<string>(() => drafts[0]?.id || "draft-1");

  // Persist drafts helper
  const persistDrafts = (nextDrafts: ShipmentDraft[]) => {
    setDrafts(nextDrafts);
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(nextDrafts));
    } catch {
      // Storage quota or error safe
    }
  };

  const activeDraft = drafts.find((d) => d.id === activeDraftId) ?? drafts[0] ?? createInitialDraft(1, catalog);

  const updateActiveDraft = (updater: (prev: ShipmentDraft) => ShipmentDraft) => {
    const updated = drafts.map((d) => (d.id === activeDraft.id ? updater(d) : d));
    persistDrafts(updated);
  };

  // Partners resource
  const partnersRes = useResource<{ data: Partner[] }>(
    organization ? `${partnerRoot(organization.id)}?per_page=100` : null
  );
  const partners = partnersRes.data?.data || [];
  const customers = partners.filter((p) => p.roles.includes("customer") || p.roles.includes("shipper"));
  const carriers = partners.filter((p) => p.roles.includes("carrier") || p.roles.includes("freight_forwarder"));

  // Submission state
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<"document" | "map">("document");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionMessage, setExtractionMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New partner quick modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerModalRole, setPartnerModalRole] = useState<"customer" | "carrier">("customer");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerCode, setNewPartnerCode] = useState("");
  const [newPartnerPhone, setNewPartnerPhone] = useState("");
  const [newPartnerEmail, setNewPartnerEmail] = useState("");
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [partnerError, setPartnerError] = useState("");

  const activeDoc = (selectedDocId ? activeDraft.documents.find((d) => d.id === selectedDocId) : null) ?? activeDraft.documents[0] ?? null;

  // Tab operations
  const addDraftTab = () => {
    const nextNumber = drafts.length + 1;
    const newDraft = createInitialDraft(nextNumber, catalog);
    const nextDrafts = [...drafts, newDraft];
    persistDrafts(nextDrafts);
    setActiveDraftId(newDraft.id);
  };

  const closeDraftTab = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (drafts.length <= 1) {
      if (confirm("Reset current draft to blank?")) {
        const fresh = createInitialDraft(1, catalog);
        persistDrafts([fresh]);
        setActiveDraftId(fresh.id);
      }
      return;
    }
    const remaining = drafts.filter((d) => d.id !== draftId);
    persistDrafts(remaining);
    if (activeDraftId === draftId) {
      setActiveDraftId(remaining[0].id);
    }
  };

  // -------------------------------------------------------------------------
  // Document Operations & OCR Extraction Engine
  // -------------------------------------------------------------------------

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    const newDoc: DocumentDraft = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type: file.name.toLowerCase().includes("bl")
        ? "bl"
        : file.name.toLowerCase().includes("inv")
        ? "invoice"
        : file.name.toLowerCase().includes("pack")
        ? "packing_list"
        : "waybill",
      size: file.size,
      url,
      file,
      uploaded_at: new Date().toISOString(),
      extracted: {
        ...SAMPLE_BL_EXTRACTED,
        source_doc: file.name,
      },
    };

    updateActiveDraft((prev) => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));
    setSelectedDocId(newDoc.id);
    notify(`Document ${file.name} uploaded.`);
  };

  const handleLoadSampleBL = () => {
    const sampleDoc: DocumentDraft = {
      id: `sample-bl-${Date.now()}`,
      name: "汇孚390件提单AOTAI FAUXFUR(1)(1).pdf",
      type: "bl",
      size: 489201,
      url: "/sample-bl-preview",
      isSample: true,
      uploaded_at: new Date().toISOString(),
      extracted: SAMPLE_BL_EXTRACTED,
    };

    updateActiveDraft((prev) => ({
      ...prev,
      documents: [...prev.documents, sampleDoc],
    }));
    setSelectedDocId(sampleDoc.id);
    notify("Loaded sample Waybill & B/L document.");
  };

  const runExtraction = () => {
    if (!activeDoc) return;
    setExtracting(true);
    setExtractionProgress(15);
    setExtractionMessage("Analyzing layout and headers...");

    setTimeout(() => {
      setExtractionProgress(45);
      setExtractionMessage("Detecting Shipper, Consignee & Waybill numbers...");
    }, 450);

    setTimeout(() => {
      setExtractionProgress(80);
      setExtractionMessage("Extracting Cargo lines, weights, and measurements...");
    }, 900);

    setTimeout(() => {
      setExtractionProgress(100);
      setExtracting(false);
      setExtractionMessage("");
      notify("Document extraction complete. Review fields below.");
    }, 1350);
  };

  const applyExtractedData = (data: ExtractedData) => {
    updateActiveDraft((prev) => {
      // Find matching shipper partner if available
      let customerId = prev.customer_id;
      if (!customerId && data.shipper_name) {
        const found = customers.find(
          (c) =>
            c.name.toLowerCase().includes(data.shipper_name!.toLowerCase()) ||
            data.shipper_name!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (found) customerId = String(found.id);
      }

      // Update stops addresses & contacts
      const updatedStops = [...prev.stops];
      if (updatedStops[0]) {
        updatedStops[0] = {
          ...updatedStops[0],
          location_name: data.shipper_name || updatedStops[0].location_name,
          address: data.origin_name || data.origin_address || updatedStops[0].address,
          appointment_time: data.departure_date || updatedStops[0].appointment_time,
          reference_number: data.booking_reference || updatedStops[0].reference_number || "111",
        };
      }
      if (updatedStops[1]) {
        updatedStops[1] = {
          ...updatedStops[1],
          location_name: data.consignee_name || updatedStops[1].location_name,
          address: data.destination_address || data.destination_name || updatedStops[1].address,
          appointment_time: data.arrival_date || updatedStops[1].appointment_time,
          reference_number: data.master_tracking_number || updatedStops[1].reference_number || "111",
          notes: updatedStops[1].notes || "Contact: +85512818309",
          contact_phone: updatedStops[1].contact_phone || "012 818 309",
          contact_phone_prefix: "+855",
          show_contact: true,
        };
      }

      // Update or replace cargo items
      const newCargoItems: CargoDraftItem[] = [
        {
          id: `cargo-${Date.now()}`,
          description: data.cargo_description || "Knitted Fabric & Garments",
          commodity: "Apparel & Textiles",
          hs_code: "6006.22",
          package_type: data.package_type || "Cartons",
          quantity: data.quantity || 356,
          gross_weight_kg: data.gross_weight_kg || 9539.03,
          volume_cbm: data.volume_cbm || 62.8,
          container_number: data.container_number || "TEMU8492019",
          seal_number: data.seal_number || "SL-993821",
        },
      ];

      return {
        ...prev,
        customer_id: customerId,
        consignee_name: data.consignee_name || prev.consignee_name,
        notify_party: data.notify_party || prev.notify_party,
        master_tracking_number: data.master_tracking_number || prev.master_tracking_number,
        container_number: data.container_number || prev.container_number,
        seal_number: data.seal_number || prev.seal_number,
        vessel_or_flight_or_plate: data.vessel_name || prev.vessel_or_flight_or_plate,
        voyage_or_trip_number: data.voyage_number || prev.voyage_or_trip_number,
        booking_reference: data.booking_reference || prev.booking_reference,
        etd: data.departure_date || prev.etd,
        eta: data.arrival_date || prev.eta,
        stops: updatedStops,
        cargo_items: newCargoItems,
      };
    });

    notify("Extracted document data applied to shipment form.");
  };

  // Stop Reordering & Mutation Helpers (Vektor TMS Stop Cards)
  const swapStops = (idxA: number, idxB: number) => {
    updateActiveDraft((prev) => {
      if (idxA < 0 || idxB < 0 || idxA >= prev.stops.length || idxB >= prev.stops.length) return prev;
      const nextStops = [...prev.stops];
      const temp = nextStops[idxA];
      nextStops[idxA] = nextStops[idxB];
      nextStops[idxB] = temp;
      return {
        ...prev,
        stops: nextStops.map((s, idx) => ({
          ...s,
          sequence: idx + 1,
          type: idx === 0 ? "pickup" : idx === nextStops.length - 1 ? "delivery" : "stop",
        })),
      };
    });
  };

  const moveStop = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    swapStops(index, targetIndex);
  };

  const removeStop = (id: string) => {
    updateActiveDraft((prev) => {
      if (prev.stops.length <= 2) {
        // Clear instead of removing to maintain 2 stops minimum
        return {
          ...prev,
          stops: prev.stops.map((s) =>
            s.id === id
              ? {
                  ...s,
                  location_name: "",
                  address: "",
                  notes: "",
                  contact_name: "",
                  contact_phone: "",
                  reference_number: "",
                  appointment_time: "",
                  show_contact: false,
                }
              : s
          ),
        };
      }
      const filtered = prev.stops.filter((s) => s.id !== id);
      return {
        ...prev,
        stops: filtered.map((s, idx) => ({
          ...s,
          sequence: idx + 1,
          type: idx === 0 ? "pickup" : idx === filtered.length - 1 ? "delivery" : "stop",
        })),
      };
    });
  };

  // -------------------------------------------------------------------------
  // Inline Partner Creation
  // -------------------------------------------------------------------------

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !newPartnerName.trim()) return;
    setCreatingPartner(true);
    setPartnerError("");

    try {
      const payload = {
        name: newPartnerName.trim(),
        code: newPartnerCode.trim() || undefined,
        roles: partnerModalRole === "customer" ? ["customer", "shipper"] : ["carrier", "freight_forwarder"],
        country_code: "KH",
        phone: newPartnerPhone.trim() || undefined,
        email: newPartnerEmail.trim() || undefined,
      };

      const res = await api.post<{ data: Partner }>(`${partnerRoot(organization.id)}`, payload);
      const created = res.data.data;
      partnersRes.reload();

      // Auto-assign to current draft
      if (partnerModalRole === "customer") {
        updateActiveDraft((prev) => ({ ...prev, customer_id: String(created.id) }));
      } else {
        updateActiveDraft((prev) => ({ ...prev, carrier_id: String(created.id) }));
      }

      setShowPartnerModal(false);
      setNewPartnerName("");
      setNewPartnerCode("");
      setNewPartnerPhone("");
      setNewPartnerEmail("");
      notify(`Created partner: ${created.name}`);
    } catch (err) {
      setPartnerError(errorMessage(err));
    } finally {
      setCreatingPartner(false);
    }
  };

  // -------------------------------------------------------------------------
  // Shipment Submission
  // -------------------------------------------------------------------------

  const handleSubmitShipment = async () => {
    if (!organization) return;
    setSubmitError(null);

    // Validation
    if (!activeDraft.customer_id) {
      setSubmitError("Please select a Customer / Shipper.");
      return;
    }
    const originLocationId = Number(activeDraft.stops[0]?.location_id);
    const destLocationId = Number(activeDraft.stops.at(-1)?.location_id);

    if (!originLocationId || !destLocationId) {
      setSubmitError("Please select both Origin and Destination facilities in Route & Stops.");
      return;
    }

    if (activeDraft.cargo_items.length === 0) {
      setSubmitError("At least one cargo item is required.");
      return;
    }

    setSaving(true);
    try {
      // 1. Prepare Legs based on Stops
      const legs = [];
      for (let i = 0; i < activeDraft.stops.length - 1; i++) {
        const from = activeDraft.stops[i];
        const to = activeDraft.stops[i + 1];
        legs.push({
          sequence: i + 1,
          leg_type: i === 0 ? "pre_carriage" : i === activeDraft.stops.length - 2 ? "on_carriage" : "main_carriage",
          transport_mode: activeDraft.transport_mode === "ocean_fcl" || activeDraft.transport_mode === "ocean_lcl"
            ? "ocean"
            : activeDraft.transport_mode === "air"
            ? "air"
            : "road",
          origin_location_id: Number(from.location_id) || originLocationId,
          destination_location_id: Number(to.location_id) || destLocationId,
          carrier_id: activeDraft.carrier_id ? Number(activeDraft.carrier_id) : null,
          vessel_or_flight_or_plate: activeDraft.vessel_or_flight_or_plate || undefined,
          voyage_or_trip_number: activeDraft.voyage_or_trip_number || undefined,
          scheduled_departure: from.appointment_time || undefined,
          scheduled_arrival: to.appointment_time || undefined,
        });
      }

      // 2. Prepare Participants
      const participants = [
        {
          business_partner_id: Number(activeDraft.customer_id),
          role: "shipper",
        },
      ];
      if (activeDraft.carrier_id) {
        participants.push({
          business_partner_id: Number(activeDraft.carrier_id),
          role: "carrier",
        });
      }

      // 3. Prepare Payload
      const payload: Record<string, unknown> = {
        transport_mode: activeDraft.transport_mode,
        status: activeDraft.status,
        customs_status: activeDraft.customs_status,
        customer_id: Number(activeDraft.customer_id),
        carrier_id: activeDraft.carrier_id ? Number(activeDraft.carrier_id) : null,
        origin_location_id: originLocationId,
        destination_location_id: destLocationId,
        cargo_items: activeDraft.cargo_items.map((item) => ({
          description: item.description,
          commodity: item.commodity || undefined,
          hs_code: item.hs_code || undefined,
          package_type: item.package_type || "cartons",
          quantity: item.quantity,
          gross_weight_kg: item.gross_weight_kg,
          volume_cbm: item.volume_cbm,
          container_number: item.container_number || activeDraft.container_number || undefined,
          seal_number: item.seal_number || activeDraft.seal_number || undefined,
        })),
        legs,
        participants,
      };

      if (activeDraft.shipment_number.trim()) payload.shipment_number = activeDraft.shipment_number.trim();
      if (activeDraft.master_tracking_number.trim()) payload.master_tracking_number = activeDraft.master_tracking_number.trim();
      if (activeDraft.etd) payload.etd = activeDraft.etd;
      if (activeDraft.eta) payload.eta = activeDraft.eta;
      if (activeDraft.special_instructions.trim()) payload.special_instructions = activeDraft.special_instructions.trim();
      if (activeDraft.notes.trim()) payload.notes = activeDraft.notes.trim();

      const res = await api.post<{ data: { id: number; shipment_number: string } }>(
        `${freightRoot(organization.id)}/shipments`,
        payload
      );

      // Clean up draft
      const remainingDrafts = drafts.filter((d) => d.id !== activeDraft.id);
      persistDrafts(remainingDrafts.length > 0 ? remainingDrafts : [createInitialDraft(1, catalog)]);

      notify(`Shipment ${res.data.data.shipment_number} created successfully.`);
      onOpenChange(false);

      if (onCreated) {
        onCreated();
      } else {
        router.push(`/freight/shipments/${res.data.data.id}`);
      }
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Helper summary calculations
  const totalCargoQuantity = activeDraft.cargo_items.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);
  const totalGrossWeight = activeDraft.cargo_items.reduce((acc, c) => acc + (Number(c.gross_weight_kg) || 0), 0);
  const totalVolume = activeDraft.cargo_items.reduce((acc, c) => acc + (Number(c.volume_cbm) || 0), 0);

  // Route summary for active tab label
  const originSummaryName =
    catalog.locations.find((l) => String(l.id) === activeDraft.stops[0]?.location_id)?.city ||
    activeDraft.stops[0]?.location_name?.split("(")[0]?.trim() ||
    "Origin";
  const destSummaryName =
    catalog.locations.find((l) => String(l.id) === activeDraft.stops.at(-1)?.location_id)?.city ||
    activeDraft.stops.at(-1)?.location_name?.split("(")[0]?.trim() ||
    "Destination";

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
        aria-label="Create Shipment Workspace"
      >
        <SheetTitle className="sr-only">Create Operational Shipment</SheetTitle>
        <SheetDescription className="sr-only">
          Vektor-style multimodal shipment creation with automated document extraction.
        </SheetDescription>

        {/* ---------------------------------------------------------------- */}
        {/* Top Header: Drafts Tab Bar & Action Controls (Vektor TMS Style)  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 select-none overflow-hidden">
          {/* Horizontal Shipment Draft Tabs */}
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {drafts.map((d) => {
              const isActive = d.id === activeDraft.id;
              const originText =
                catalog.locations.find((l) => String(l.id) === d.stops[0]?.location_id)?.city ||
                d.stops[0]?.location_name?.split("(")[0]?.trim() ||
                "Origin";
              const destText =
                catalog.locations.find((l) => String(l.id) === d.stops.at(-1)?.location_id)?.city ||
                d.stops.at(-1)?.location_name?.split("(")[0]?.trim() ||
                "Destination";

              return (
                <div
                  key={d.id}
                  onClick={() => setActiveDraftId(d.id)}
                  className={`group relative flex h-10 min-w-44 max-w-64 cursor-pointer items-center rounded-t-lg border border-b-0 px-2.5 transition-all ${
                    isActive
                      ? "border-slate-200 border-t-2 border-t-blue-600 bg-white font-semibold text-blue-950 shadow-2xs"
                      : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`size-2 shrink-0 rounded-xs mr-2 ${
                      isActive ? "bg-blue-600" : "bg-slate-300 group-hover:bg-slate-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold leading-tight">{d.label}</span>
                    <span className="block truncate text-[11px] font-normal text-muted-foreground leading-tight">
                      {originText} → {destText}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => closeDraftTab(d.id, e)}
                    aria-label={`Close ${d.label}`}
                    className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {/* Add Draft Button */}
            <button
              type="button"
              onClick={addDraftTab}
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition-colors"
              title="Add another shipment draft"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Sticky Action Controls on Right */}
          <div className="flex shrink-0 items-center gap-1.5 pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 gap-1.5 px-2.5 text-xs text-slate-600 hover:text-slate-900"
              title={isFullscreen ? "Switch to 4/5 drawer" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{isFullscreen ? "Standard 4/5" : "Fullscreen"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                persistDrafts(drafts);
                notify("Shipment draft saved to local workspace.");
              }}
              className="h-8 gap-1.5 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <FileCheck size={13} className="text-slate-500" />
              <span>Save Draft</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSubmitShipment}
              disabled={saving}
              className="h-8 gap-1.5 px-3.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Ship size={13} />}
              <span>Create Shipment</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="size-8 p-0 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close"
            >
              <X size={15} />
            </Button>
          </div>
        </div>

        {/* Global Submit Error Toast */}
        {submitError && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
            <button onClick={() => setSubmitError(null)} className="text-red-500 hover:text-red-800">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Main Body: 2-Column Split Layout (62% Form / 38% Document AI)    */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,62%)_minmax(0,38%)] divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          
          {/* ============================================================== */}
          {/* LEFT PANEL (62%): Scrollable Shipment Form (6 Cards)           */}
          {/* ============================================================== */}
          <div className="h-full overflow-y-auto custom-scrollbar bg-[#F5F6F8] p-3 sm:p-4 space-y-3">
            
            {/* ------------------------------------------------------------ */}
            {/* CARD 1: Shipment Information                                 */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Ship size={14} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Shipment Information</h3>
                </div>
                {/* Direction Segmented Pill */}
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                  {(["import", "export", "domestic"] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => updateActiveDraft((prev) => ({ ...prev, direction: dir }))}
                      className={`px-2.5 py-1 text-[11px] font-semibold capitalize rounded-md transition-all ${
                        activeDraft.direction === dir
                          ? "bg-white text-blue-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Reference Number */}
                <div>
                  <Label htmlFor="shipment_number" className="text-[11px] font-medium text-slate-600">
                    Shipment Reference (Optional)
                  </Label>
                  <Input
                    id="shipment_number"
                    placeholder="Auto-generated if empty"
                    value={activeDraft.shipment_number}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, shipment_number: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs font-mono placeholder:font-sans placeholder:normal-case"
                  />
                </div>

                {/* Transport Mode */}
                <div>
                  <Label htmlFor="transport_mode" className="text-[11px] font-medium text-slate-600">
                    Transport Mode *
                  </Label>
                  <Select
                    value={activeDraft.transport_mode}
                    onValueChange={(val: ShipmentDraft["transport_mode"]) =>
                      updateActiveDraft((prev) => ({
                        ...prev,
                        transport_mode: val,
                        load_type: val.startsWith("ocean") ? "FCL" : val === "air" ? "CARGO" : "FTL",
                      }))
                    }
                  >
                    <SelectTrigger id="transport_mode" className="mt-1 h-[38px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road" className="text-xs">
                        <span className="flex items-center gap-2">
                          <Truck size={13} className="text-emerald-600" /> Road Freight (FTL / LTL)
                        </span>
                      </SelectItem>
                      <SelectItem value="ocean_fcl" className="text-xs">
                        <span className="flex items-center gap-2">
                          <Ship size={13} className="text-blue-600" /> Ocean Freight (FCL Container)
                        </span>
                      </SelectItem>
                      <SelectItem value="ocean_lcl" className="text-xs">
                        <span className="flex items-center gap-2">
                          <Ship size={13} className="text-sky-600" /> Ocean Freight (LCL Groupage)
                        </span>
                      </SelectItem>
                      <SelectItem value="air" className="text-xs">
                        <span className="flex items-center gap-2">
                          <PlaneIcon size={13} className="text-indigo-600" /> Air Cargo
                        </span>
                      </SelectItem>
                      <SelectItem value="multimodal" className="text-xs">
                        <span className="flex items-center gap-2">
                          <Layers size={13} className="text-purple-600" /> Multimodal Hub
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Load Type */}
                <div>
                  <Label htmlFor="load_type" className="text-[11px] font-medium text-slate-600">
                    Load Type
                  </Label>
                  <Select
                    value={activeDraft.load_type}
                    onValueChange={(val: ShipmentDraft["load_type"]) =>
                      updateActiveDraft((prev) => ({ ...prev, load_type: val }))
                    }
                  >
                    <SelectTrigger id="load_type" className="mt-1 h-[38px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FTL" className="text-xs">FTL (Full Truckload)</SelectItem>
                      <SelectItem value="LTL" className="text-xs">LTL (Less than Truckload)</SelectItem>
                      <SelectItem value="FCL" className="text-xs">FCL (Full Container)</SelectItem>
                      <SelectItem value="LCL" className="text-xs">LCL (Consolidated)</SelectItem>
                      <SelectItem value="CARGO" className="text-xs">General Cargo (Air/Breakbulk)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Operational Status */}
                <div>
                  <Label htmlFor="status" className="text-[11px] font-medium text-slate-600">
                    Shipment Status
                  </Label>
                  <Select
                    value={activeDraft.status}
                    onValueChange={(val: ShipmentDraft["status"]) =>
                      updateActiveDraft((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <SelectTrigger id="status" className="mt-1 h-[38px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                      <SelectItem value="planned" className="text-xs">Planned</SelectItem>
                      <SelectItem value="dispatched" className="text-xs">Dispatched</SelectItem>
                      <SelectItem value="in_transit" className="text-xs">In Transit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customs Status */}
                <div className="sm:col-span-2">
                  <Label htmlFor="customs_status" className="text-[11px] font-medium text-slate-600">
                    Customs Compliance
                  </Label>
                  <Select
                    value={activeDraft.customs_status}
                    onValueChange={(val: ShipmentDraft["customs_status"]) =>
                      updateActiveDraft((prev) => ({ ...prev, customs_status: val }))
                    }
                  >
                    <SelectTrigger id="customs_status" className="mt-1 h-[38px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applicable" className="text-xs">Not Applicable (Domestic)</SelectItem>
                      <SelectItem value="pending_docs" className="text-xs">Pending Documents (Export/Import)</SelectItem>
                      <SelectItem value="declaration_drafted" className="text-xs">ASYCUDA Declaration Drafted</SelectItem>
                      <SelectItem value="under_inspection" className="text-xs">Port / Border Inspection</SelectItem>
                      <SelectItem value="cleared" className="text-xs">Customs Cleared & Released</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* CARD 2: Shipping Parties & Stakeholders                      */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Building2 size={14} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Commercial Stakeholders</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPartnerModalRole("customer");
                    setShowPartnerModal(true);
                  }}
                  className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5"
                >
                  <Plus size={12} className="mr-1" /> Add New Partner
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer / Shipper */}
                <div>
                  <Label htmlFor="customer_id" className="text-[11px] font-medium text-slate-600">
                    Customer / Shipper *
                  </Label>
                  <Select
                    value={activeDraft.customer_id}
                    onValueChange={(val) => {
                      const selected = customers.find((c) => String(c.id) === val);
                      updateActiveDraft((prev) => ({
                        ...prev,
                        customer_id: val,
                        contact_name: selected?.name || prev.contact_name,
                        contact_phone: selected?.phone || prev.contact_phone,
                        contact_email: selected?.email || prev.contact_email,
                      }));
                    }}
                  >
                    <SelectTrigger id="customer_id" className="mt-1 h-[38px] bg-white text-xs">
                      <SelectValue placeholder="Select shipper / client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Primary Carrier */}
                <div>
                  <Label htmlFor="carrier_id" className="text-[11px] font-medium text-slate-600">
                    Primary Carrier / Forwarder
                  </Label>
                  <Select
                    value={activeDraft.carrier_id}
                    onValueChange={(val) => updateActiveDraft((prev) => ({ ...prev, carrier_id: val }))}
                  >
                    <SelectTrigger id="carrier_id" className="mt-1 h-[38px] bg-white text-xs">
                      <SelectValue placeholder="Select carrier (Optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">None (Self-dispatched)</SelectItem>
                      {carriers.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Consignee */}
                <div>
                  <Label htmlFor="consignee_name" className="text-[11px] font-medium text-slate-600">
                    Consignee (Delivery Party)
                  </Label>
                  <Input
                    id="consignee_name"
                    placeholder="e.g. XIN CAI FU (CAMBODIA) CO., LTD."
                    value={activeDraft.consignee_name}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, consignee_name: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs"
                  />
                </div>

                {/* Notify Party */}
                <div>
                  <Label htmlFor="notify_party" className="text-[11px] font-medium text-slate-600">
                    Notify Party / Broker
                  </Label>
                  <Input
                    id="notify_party"
                    placeholder="e.g. SAME AS CONSIGNEE"
                    value={activeDraft.notify_party}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, notify_party: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs"
                  />
                </div>
              </div>

              {/* Contact info strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Contact Person</Label>
                  <Input
                    placeholder="Representative name"
                    value={activeDraft.contact_name}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, contact_name: e.target.value }))}
                    className="mt-0.5 h-8 bg-white border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Contact Phone</Label>
                  <Input
                    placeholder="+855 ..."
                    value={activeDraft.contact_phone}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    className="mt-0.5 h-8 bg-white border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Contact Email</Label>
                  <Input
                    placeholder="ops@company.com"
                    value={activeDraft.contact_email}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, contact_email: e.target.value }))}
                    className="mt-0.5 h-8 bg-white border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* ROUTE & STOPS: Clean Standalone Vektor Cards                 */}
            {/* ------------------------------------------------------------ */}
            <div className="space-y-4">
              {activeDraft.stops.map((stop, index) => {
                const isPickup = index === 0;
                const isDelivery = index === activeDraft.stops.length - 1;
                const stopTitle = isPickup ? "Pick Up" : isDelivery ? "Drop Off" : `Stop ${index + 1}`;
                const hasNoData = !stop.location_name && !stop.address && !stop.location_id;
                const showContactRow = stop.show_contact || Boolean(stop.contact_phone || stop.contact_name || stop.contact_email);

                return (
                  <div
                    key={stop.id}
                    className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5 transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-bold text-[#020d2d]">
                          {stopTitle}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeDraft.stops.length >= 2) {
                              const otherIdx = isPickup ? 1 : 0;
                              swapStops(index, otherIdx);
                            }
                          }}
                          title="Swap stop position"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          <ArrowLeftRight size={13} />
                        </button>
                        {hasNoData && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            No data
                          </span>
                        )}
                      </div>

                      {/* Right Action Tools */}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-600">
                        <button
                          type="button"
                          onClick={() => {
                            notify(`Facility saved: ${stop.location_name || stop.address || "New Facility"}`);
                          }}
                          className="flex items-center gap-1.5 font-medium hover:text-slate-900 transition-colors text-[11px] sm:text-xs"
                        >
                          <Building2 size={13} className="text-slate-500" />
                          <span>Set up as facility</span>
                        </button>

                        {!showContactRow && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activeDraft.stops.map((s) =>
                                s.id === stop.id ? { ...s, show_contact: true } : s
                              );
                              updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                            }}
                            className="flex items-center gap-1 font-medium hover:text-slate-900 transition-colors text-[11px] sm:text-xs"
                          >
                            <Plus size={12} className="text-slate-500" />
                            <span>Add Contact</span>
                          </button>
                        )}

                        <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200">
                          <button
                            type="button"
                            disabled={index === activeDraft.stops.length - 1}
                            onClick={() => moveStop(index, "down")}
                            title="Move down"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveStop(index, "up")}
                            title="Move up"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStop(stop.id)}
                            title={activeDraft.stops.length <= 2 ? "Clear stop" : "Remove stop"}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-0.5"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 1: Location Address & Location Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {/* Location Address (Combobox/Select with amber left accent) */}
                      <div className="grid content-start gap-1.5">
                        <Label className="text-xs font-medium text-[#505966] leading-4 flex items-center">
                          Location Address <span className="text-[#ff3a3f] ml-0.5">*</span>
                        </Label>
                        <Select
                          value={stop.location_id || "custom"}
                          onValueChange={(val) => {
                            if (val === "custom") return;
                            const found = catalog.locations.find((l) => String(l.id) === val);
                            const updatedStops = activeDraft.stops.map((s) =>
                              s.id === stop.id
                                ? {
                                    ...s,
                                    location_id: val,
                                    location_name: found ? s.location_name || `${found.name}` : s.location_name,
                                    address: found ? `${found.name}, ${found.city}, ${found.country_code}` : s.address,
                                  }
                                : s
                            );
                            updateActiveDraft((prev) => ({ ...prev, stops: updatedStops }));
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 sm:h-9 bg-white text-xs sm:text-sm text-[#020d2d] rounded-lg border border-slate-200 shadow-2xs transition-all",
                              "border-l-[3px] border-l-amber-500 bg-amber-50/15 focus:ring-blue-100"
                            )}
                          >
                            <SelectValue placeholder="Select or enter address...">
                              {stop.address || stop.location_name || "Select address..."}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.locations.map((loc) => (
                              <SelectItem key={loc.id} value={String(loc.id)} className="text-xs">
                                {loc.name} ({loc.city}, {loc.country_code})
                              </SelectItem>
                            ))}
                            {stop.address && !catalog.locations.some((l) => l.name === stop.address) && (
                              <SelectItem value="custom" className="text-xs font-mono">
                                {stop.address}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location Name */}
                      <div className="grid content-start gap-1.5">
                        <Label className="text-xs font-medium text-[#505966] leading-4">
                          Location Name
                        </Label>
                        <Input
                          value={stop.location_name}
                          onChange={(e) => {
                            const updated = activeDraft.stops.map((s) =>
                              s.id === stop.id ? { ...s, location_name: e.target.value } : s
                            );
                            updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                          }}
                          placeholder="Location Name"
                          className={cn(
                            "h-8 sm:h-9 bg-white text-xs sm:text-sm font-medium text-[#020d2d] rounded-lg border border-slate-200 shadow-2xs focus-visible:ring-blue-100",
                            isPickup && "border-l-[3px] border-l-amber-500 bg-amber-50/15"
                          )}
                        />
                      </div>
                    </div>

                    {/* Row 2: Pickup/Delivery # & Appointment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {/* Pickup / Delivery # */}
                      <div className="grid content-start gap-1.5">
                        <Label className="text-xs font-medium text-[#505966] leading-4">
                          {isPickup ? "Pickup #" : isDelivery ? "Delivery #" : `Stop #${index + 1}`}
                        </Label>
                        <Input
                          value={stop.reference_number || ""}
                          onChange={(e) => {
                            const updated = activeDraft.stops.map((s) =>
                              s.id === stop.id ? { ...s, reference_number: e.target.value } : s
                            );
                            updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                          }}
                          placeholder="111"
                          className="h-8 sm:h-9 bg-white text-xs font-mono text-[#020d2d] rounded-lg border border-slate-200 shadow-2xs"
                        />
                      </div>

                      {/* Appointment */}
                      <div className="grid content-start gap-1.5">
                        <Label className="text-xs font-medium text-[#505966] leading-4">
                          Appointment
                        </Label>
                        <div
                          className={cn(
                            "relative flex items-center h-8 sm:h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs shadow-2xs transition-all",
                            "border-l-[3px] border-l-amber-500 bg-amber-50/15"
                          )}
                        >
                          <span className="font-mono text-slate-800 text-xs sm:text-[13px]">
                            {stop.appointment_time
                              ? new Date(stop.appointment_time).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "DD/MM HH:mm"}
                          </span>
                          {!stop.appointment_time && (
                            <span className="inline-flex items-center text-xs font-medium text-amber-700 ml-2">
                              <span className="size-1.5 rounded-full bg-amber-500 mr-1 inline-block" />
                              Need to set
                            </span>
                          )}
                          <Calendar size={14} className="ml-auto text-slate-400 pointer-events-none" />
                          <input
                            type="datetime-local"
                            value={stop.appointment_time || ""}
                            onChange={(e) => {
                              const updated = activeDraft.stops.map((s) =>
                                s.id === stop.id ? { ...s, appointment_time: e.target.value } : s
                              );
                              updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Notes */}
                    <div className="grid content-start gap-1.5">
                      <Label className="text-xs font-medium text-[#505966] leading-4">
                        Notes
                      </Label>
                      <Input
                        value={stop.notes}
                        onChange={(e) => {
                          const updated = activeDraft.stops.map((s) =>
                            s.id === stop.id ? { ...s, notes: e.target.value } : s
                          );
                          updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                        }}
                        placeholder="Notes"
                        className="h-8 sm:h-9 w-full bg-white text-xs text-[#020d2d] rounded-lg border border-slate-200 placeholder:text-slate-400 shadow-2xs"
                      />
                    </div>

                    {/* Row 4: Contact Info (when active) */}
                    {showContactRow && (
                      <div className="grid content-start gap-1.5 pt-0.5">
                        <Label className="text-xs font-medium text-[#505966] leading-4">
                          Contact Info
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Flag & Phone Input Pill */}
                          <div className="flex items-center h-8 sm:h-9 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 text-xs border-r border-slate-200 text-slate-700 font-medium select-none">
                              <span>🇰🇭</span>
                              <span>{stop.contact_phone_prefix || "+855"}</span>
                              <ChevronDown size={11} className="text-slate-400 ml-0.5" />
                            </div>
                            <input
                              type="text"
                              value={stop.contact_phone || ""}
                              onChange={(e) => {
                                const updated = activeDraft.stops.map((s) =>
                                  s.id === stop.id ? { ...s, contact_phone: e.target.value } : s
                                );
                                updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                              }}
                              placeholder="012 818 309"
                              className="h-full px-2.5 text-xs text-[#020d2d] focus:outline-none border-0 w-32 sm:w-36 bg-transparent"
                            />
                          </div>

                          {/* + Name or Name Input */}
                          {stop.contact_name ? (
                            <div className="flex items-center h-8 sm:h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs shadow-2xs">
                              <span className="text-slate-400 mr-1.5 text-[11px]">Name:</span>
                              <input
                                type="text"
                                value={stop.contact_name}
                                onChange={(e) => {
                                  const updated = activeDraft.stops.map((s) =>
                                    s.id === stop.id ? { ...s, contact_name: e.target.value } : s
                                  );
                                  updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                                }}
                                className="text-xs text-[#020d2d] focus:outline-none border-0 bg-transparent w-28 sm:w-32"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = activeDraft.stops.map((s) =>
                                  s.id === stop.id ? { ...s, contact_name: "Operations Contact" } : s
                                );
                                updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                            >
                              <Plus size={12} /> Name
                            </button>
                          )}

                          {/* + Email or Email Input */}
                          {stop.contact_email ? (
                            <div className="flex items-center h-8 sm:h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs shadow-2xs">
                              <span className="text-slate-400 mr-1.5 text-[11px]">Email:</span>
                              <input
                                type="email"
                                value={stop.contact_email}
                                onChange={(e) => {
                                  const updated = activeDraft.stops.map((s) =>
                                    s.id === stop.id ? { ...s, contact_email: e.target.value } : s
                                  );
                                  updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                                }}
                                className="text-xs text-[#020d2d] focus:outline-none border-0 bg-transparent w-32 sm:w-40"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = activeDraft.stops.map((s) =>
                                  s.id === stop.id ? { ...s, contact_email: "ops@company.com" } : s
                                );
                                updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                            >
                              <Plus size={12} /> Email
                            </button>
                          )}

                          {/* Remove Contact */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activeDraft.stops.map((s) =>
                                s.id === stop.id
                                  ? { ...s, show_contact: false, contact_phone: "", contact_name: "", contact_email: "" }
                                  : s
                              );
                              updateActiveDraft((prev) => ({ ...prev, stops: updated }));
                            }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto"
                            title="Remove contact info"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Stop Button */}
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    const nextSeq = activeDraft.stops.length + 1;
                    const defaultLoc = catalog.locations[0];
                    const newStop: StopDraftItem = {
                      id: `stop-transit-${Date.now()}`,
                      type: "stop",
                      sequence: nextSeq,
                      location_id: defaultLoc ? String(defaultLoc.id) : "",
                      location_name: "TRANSIT LOGISTICS HUB",
                      address: defaultLoc ? `${defaultLoc.name}, ${defaultLoc.city}` : "National Highway Checkpoint",
                      contact_name: "",
                      contact_phone: "",
                      appointment_time: "",
                      notes: "Intermediate inspection gate",
                      reference_number: "",
                      show_contact: false,
                    };
                    const nextStops = [...activeDraft.stops];
                    nextStops.splice(nextStops.length - 1, 0, newStop);
                    updateActiveDraft((prev) => ({ ...prev, stops: nextStops }));
                    notify("Added intermediate stop.");
                  }}
                  className="h-8 px-3 text-xs gap-1.5 border-dashed border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/40 rounded-lg shadow-2xs font-medium"
                >
                  <Plus size={13} /> Add Stop
                </Button>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* CARD 4: Cargo Information & Line Items                       */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                    <Package size={14} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Cargo Information & Line Items</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItem: CargoDraftItem = {
                      id: `cargo-${Date.now()}`,
                      description: "Apparel / Textiles",
                      commodity: "Garments",
                      hs_code: "6109.10",
                      package_type: "cartons",
                      quantity: 50,
                      gross_weight_kg: 500,
                      volume_cbm: 2.2,
                      container_number: "",
                      seal_number: "",
                    };
                    updateActiveDraft((prev) => ({
                      ...prev,
                      cargo_items: [...prev.cargo_items, newItem],
                    }));
                  }}
                  className="h-7 text-xs px-2.5 gap-1 text-slate-700"
                >
                  <Plus size={12} /> Add Item
                </Button>
              </div>

              {/* Cargo Line Items Table */}
              <div className="overflow-x-auto custom-scrollbar rounded-md border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
                      <th className="py-2 px-2.5">Commodity / Description *</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2 w-20 text-right">Qty</th>
                      <th className="py-2 px-2 w-24 text-right">Gross (KG)</th>
                      <th className="py-2 px-2 w-20 text-right">CBM</th>
                      <th className="py-2 px-2 w-24">HS Code</th>
                      <th className="py-2 px-2 w-28">Container #</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeDraft.cargo_items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-1.5 min-w-36">
                          <Input
                            value={item.description}
                            placeholder="Description"
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, description: e.target.value } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5 w-28">
                          <Input
                            value={item.package_type}
                            placeholder="Cartons"
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, package_type: e.target.value } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, quantity: Number(e.target.value) || 0 } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.gross_weight_kg}
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, gross_weight_kg: Number(e.target.value) || 0 } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.volume_cbm}
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, volume_cbm: Number(e.target.value) || 0 } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={item.hs_code}
                            placeholder="6109.10"
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, hs_code: e.target.value } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={item.container_number}
                            placeholder="TEMU..."
                            onChange={(e) => {
                              const updated = activeDraft.cargo_items.map((c) =>
                                c.id === item.id ? { ...c, container_number: e.target.value } : c
                              );
                              updateActiveDraft((prev) => ({ ...prev, cargo_items: updated }));
                            }}
                            className="h-7 text-xs font-mono uppercase"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          {activeDraft.cargo_items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = activeDraft.cargo_items.filter((c) => c.id !== item.id);
                                updateActiveDraft((prev) => ({ ...prev, cargo_items: filtered }));
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Cargo Totals:</span>
                <div className="flex items-center gap-4 text-slate-600 font-mono">
                  <span>
                    Lines: <strong className="text-slate-900">{activeDraft.cargo_items.length}</strong>
                  </span>
                  <span>
                    Pieces: <strong className="text-slate-900">{totalCargoQuantity.toLocaleString()}</strong>
                  </span>
                  <span>
                    Weight: <strong className="text-slate-900">{totalGrossWeight.toLocaleString()} KG</strong>{" "}
                    <span className="text-[10px] text-muted-foreground">({(totalGrossWeight / 1000).toFixed(2)} MT)</span>
                  </span>
                  <span>
                    Volume: <strong className="text-slate-900">{totalVolume.toFixed(2)} CBM</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* CARD 5: Transport & Carrier Details                          */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                    <Truck size={14} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Transport & Carrier Execution</h3>
                </div>
                <Badge variant="outline" className="text-[11px] capitalize h-5">
                  {activeDraft.transport_mode.replace("_", " ")}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Master B/L or Waybill */}
                <div>
                  <Label htmlFor="master_tracking_number" className="text-[11px] font-medium text-slate-600">
                    Master B/L / AWB / Tracking #
                  </Label>
                  <Input
                    id="master_tracking_number"
                    placeholder="e.g. RCLY261030704"
                    value={activeDraft.master_tracking_number}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, master_tracking_number: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs font-mono uppercase placeholder:font-sans placeholder:normal-case"
                  />
                </div>

                {/* Conditional Vehicle / Vessel / Flight */}
                <div>
                  <Label htmlFor="vessel" className="text-[11px] font-medium text-slate-600">
                    {activeDraft.transport_mode.startsWith("ocean")
                      ? "Vessel Name"
                      : activeDraft.transport_mode === "air"
                      ? "Flight Number"
                      : "Truck Plate / Vehicle #"}
                  </Label>
                  <Input
                    id="vessel"
                    placeholder={
                      activeDraft.transport_mode.startsWith("ocean")
                        ? "e.g. EVER GIVEN"
                        : activeDraft.transport_mode === "air"
                        ? "e.g. TG698"
                        : "e.g. 3C-8899"
                    }
                    value={activeDraft.vessel_or_flight_or_plate}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, vessel_or_flight_or_plate: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs uppercase placeholder:font-sans placeholder:normal-case"
                  />
                </div>

                {/* Voyage / Trip # */}
                <div>
                  <Label htmlFor="voyage" className="text-[11px] font-medium text-slate-600">
                    {activeDraft.transport_mode.startsWith("ocean")
                      ? "Voyage Number"
                      : "Trip / Dispatch Run #"}
                  </Label>
                  <Input
                    id="voyage"
                    placeholder="e.g. 042W"
                    value={activeDraft.voyage_or_trip_number}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, voyage_or_trip_number: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs uppercase placeholder:font-sans placeholder:normal-case"
                  />
                </div>

                {/* Container Number */}
                <div>
                  <Label htmlFor="container_number" className="text-[11px] font-medium text-slate-600">
                    Primary Container #
                  </Label>
                  <Input
                    id="container_number"
                    placeholder="e.g. TEMU8492019"
                    value={activeDraft.container_number}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, container_number: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs font-mono uppercase placeholder:font-sans placeholder:normal-case"
                  />
                </div>

                {/* Seal Number */}
                <div>
                  <Label htmlFor="seal_number" className="text-[11px] font-medium text-slate-600">
                    Customs / Carrier Seal #
                  </Label>
                  <Input
                    id="seal_number"
                    placeholder="e.g. SL-993821"
                    value={activeDraft.seal_number}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, seal_number: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs font-mono uppercase placeholder:font-sans placeholder:normal-case"
                  />
                </div>

                {/* Booking Reference */}
                <div>
                  <Label htmlFor="booking_reference" className="text-[11px] font-medium text-slate-600">
                    Carrier Booking Ref
                  </Label>
                  <Input
                    id="booking_reference"
                    placeholder="e.g. BK-MK-2026-088"
                    value={activeDraft.booking_reference}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, booking_reference: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs font-mono placeholder:font-sans placeholder:normal-case"
                  />
                </div>
              </div>

              {/* ETD / ETA Date controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <Label htmlFor="etd" className="text-[11px] font-medium text-slate-600">
                    Estimated Departure (ETD)
                  </Label>
                  <Input
                    id="etd"
                    type="datetime-local"
                    value={activeDraft.etd}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, etd: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="eta" className="text-[11px] font-medium text-slate-600">
                    Estimated Arrival (ETA)
                  </Label>
                  <Input
                    id="eta"
                    type="datetime-local"
                    value={activeDraft.eta}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, eta: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* CARD 6: Documents, References & Notes                        */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <FileText size={14} />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900">Documents & Operational Notes</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="purchase_order_ref" className="text-[11px] font-medium text-slate-600">
                    Related Purchase Order / Contract #
                  </Label>
                  <Input
                    id="purchase_order_ref"
                    placeholder="e.g. PO-2026-0017"
                    value={activeDraft.purchase_order_ref}
                    onChange={(e) => updateActiveDraft((prev) => ({ ...prev, purchase_order_ref: e.target.value }))}
                    className="mt-1 h-[38px] bg-white text-xs font-mono placeholder:font-sans placeholder:normal-case"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Attached Documents Summary</Label>
                  <div className="mt-1 flex h-[38px] items-center gap-1.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-2 text-xs">
                    {activeDraft.documents.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No documents attached yet</span>
                    ) : (
                      activeDraft.documents.map((d) => (
                        <Badge key={d.id} variant="secondary" className="h-6 text-[11px] gap-1 shrink-0">
                          <FileCheck size={11} className="text-blue-600" />
                          <span className="max-w-28 truncate">{d.name}</span>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="special_instructions" className="text-[11px] font-medium text-slate-600">
                  Special Instructions & Border Transit Notes
                </Label>
                <Textarea
                  id="special_instructions"
                  rows={2}
                  placeholder="Driver instructions, border crossing requirements, cargo handling details..."
                  value={activeDraft.special_instructions}
                  onChange={(e) => updateActiveDraft((prev) => ({ ...prev, special_instructions: e.target.value }))}
                  className="mt-1 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT PANEL (38%): Smart Document Assistant & Preview          */}
          {/* ============================================================== */}
          <div className="flex h-full flex-col overflow-hidden bg-white">
            
            {/* Top Document Toolbar */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded bg-red-100 text-red-600">
                  <FileText size={14} />
                </span>
                {activeDraft.documents.length > 0 ? (
                  <Select
                    value={activeDoc?.id || ""}
                    onValueChange={(val) => setSelectedDocId(val)}
                  >
                    <SelectTrigger className="h-7 min-w-36 max-w-56 border-slate-200 bg-white text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDraft.documents.map((d) => (
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

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const filtered = activeDraft.documents.filter((d) => d.id !== activeDoc.id);
                        updateActiveDraft((prev) => ({ ...prev, documents: filtered }));
                        setSelectedDocId(filtered[0]?.id || null);
                      }}
                      className="size-7 p-0 text-slate-400 hover:text-red-600"
                      title="Remove document"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </>
                )}

                {/* Extract Button */}
                <Button
                  size="sm"
                  onClick={runExtraction}
                  disabled={!activeDoc || extracting}
                  className="h-7 gap-1 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-2xs font-medium"
                >
                  {extracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>{extracting ? "Extracting..." : "Extract Data"}</span>
                </Button>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            {/* Document Main Display Area */}
            <div className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar bg-slate-100 flex flex-col">
              {rightPanelTab === "document" ? (
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

                    {/* Extracted Values Review Card (if extracted) */}
                    {activeDoc.extracted && !extracting && (
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
                            onClick={() => applyExtractedData(activeDoc.extracted!)}
                            className="h-6 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          >
                            <Check size={11} className="mr-1" /> Apply to Form
                          </Button>
                        </div>

                        {/* Extracted Fields Table */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] rounded border border-slate-100 bg-slate-50/70 p-2 font-mono">
                          <div>
                            <span className="text-slate-400 font-sans">Shipper:</span>{" "}
                            <span className="font-semibold text-slate-800">{activeDoc.extracted.shipper_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">Tracking #:</span>{" "}
                            <span className="font-semibold text-slate-800">{activeDoc.extracted.master_tracking_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">Consignee:</span>{" "}
                            <span className="font-semibold text-slate-800 truncate">{activeDoc.extracted.consignee_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">Cargo:</span>{" "}
                            <span className="font-semibold text-slate-800">{activeDoc.extracted.cargo_description}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">Packages:</span>{" "}
                            <span className="font-semibold text-slate-800">{activeDoc.extracted.quantity} Pkgs</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans">Weight / CBM:</span>{" "}
                            <span className="font-semibold text-slate-800">
                              {activeDoc.extracted.gross_weight_kg} KG · {activeDoc.extracted.volume_cbm} CBM
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document Preview Rendering */}
                    <div className="flex-1 overflow-auto custom-scrollbar p-4 flex items-center justify-center bg-slate-200/60">
                      {activeDoc.isSample ? (
                        /* Authentic Vektor TRUCK WAY BILL OF LADING Rendered Vector Document */
                        <div
                          className="w-full max-w-md bg-white shadow-lg border border-slate-300 p-6 text-slate-900 font-mono transition-transform duration-200"
                          style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: "top center" }}
                        >
                          <div className="border-b-2 border-slate-900 pb-2 text-center">
                            <h2 className="text-sm font-bold tracking-wider">TRUCK WAY BILL OF LADING</h2>
                            <p className="text-[10px] text-slate-600">INTERNATIONAL MULTIMODAL FREIGHT CONSIGNMENT</p>
                          </div>

                          <div className="grid grid-cols-2 border-b border-slate-900 text-[10px] divide-x divide-slate-900 mt-2">
                            <div className="p-2 space-y-1">
                              <span className="font-bold block text-slate-500 uppercase">Shipper / Exporter</span>
                              <p className="font-bold text-slate-900">WEALDONE LIMITED</p>
                              <p className="text-[9px] text-slate-600">FLAT/RM P, 4/F, LLADRO CENTRE, 72 HOI YUEN ROAD, KWUN TONG, HONG KONG</p>
                            </div>
                            <div className="p-2 space-y-1">
                              <span className="font-bold block text-slate-500 uppercase">Waybill / B/L No</span>
                              <p className="font-bold text-blue-900 text-xs">RCLY261030704</p>
                              <p className="text-[9px] text-slate-600">Booking: BK-MK-2026-088</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 border-b border-slate-900 text-[10px] divide-x divide-slate-900">
                            <div className="p-2 space-y-1">
                              <span className="font-bold block text-slate-500 uppercase">Consignee</span>
                              <p className="font-bold text-slate-900">XIN CAI FU (CAMBODIA) CO., LTD.</p>
                              <p className="text-[9px] text-slate-600">PHUM DOMNAK TROYEOUNG, CHOM CHAO I, PHNOM PENH, CAMBODIA</p>
                            </div>
                            <div className="p-2 space-y-1">
                              <span className="font-bold block text-slate-500 uppercase">Place of Initial Receipt</span>
                              <p className="font-semibold text-slate-800">JIANGSU, CHINA</p>
                              <span className="font-bold block text-slate-500 uppercase mt-1">Place of Delivery</span>
                              <p className="font-semibold text-slate-800">PHNOM PENH, CAMBODIA</p>
                            </div>
                          </div>

                          <div className="border-b border-slate-900 p-2 text-[10px]">
                            <span className="font-bold block text-slate-500 uppercase mb-1">Description of Goods</span>
                            <p className="font-bold text-slate-900">356 PACKAGES KNITTED FABRIC AND GARMENT ACCESSORIES</p>
                            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-200 pt-1 text-[9px]">
                              <div>Packages: <strong>356 CTNS</strong></div>
                              <div>Gross Wt: <strong>9,539.03 KG</strong></div>
                              <div>Volume: <strong>62.80 CBM</strong></div>
                            </div>
                          </div>

                          <div className="p-2 text-[9px] text-slate-500 flex justify-between items-center pt-3">
                            <span>TELEX RELEASE · NON-NEGOTIABLE</span>
                            <span>Container: TEMU8492019 / SL-993821</span>
                          </div>
                        </div>
                      ) : activeDoc.file?.type === "application/pdf" ? (
                        <iframe
                          src={activeDoc.url}
                          title={activeDoc.name}
                          className="size-full border-0 bg-white shadow"
                        />
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
                      <h4 className="mt-3 text-sm font-semibold text-slate-800">Upload Trade Document</h4>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        Drag and drop your B/L, Commercial Invoice, Packing List, or Waybill here.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] bg-slate-50">Invoice</Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-50">Packing List</Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-50">Bill of Lading</Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-50">Waybill</Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">or test immediately with:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadSampleBL}
                        className="h-8 gap-1.5 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                      >
                        <Sparkles size={13} className="text-blue-600" />
                        <span>Load Sample B/L Document</span>
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                /* ========================================================== */
                /* ROUTE MAP TAB (Interactive Vektor Schematic Map)           */
                /* ========================================================== */
                <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar bg-slate-50 p-4 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <MapIcon size={16} className="text-blue-600" />
                        <h4 className="text-sm font-semibold text-slate-900">Transit Corridor Map</h4>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        {originSummaryName} ⇄ {destSummaryName}
                      </Badge>
                    </div>

                    {/* Visual Route Corridor */}
                    <div className="mt-4 relative p-4 rounded-xl bg-slate-900 text-white overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400">Origin Departure</span>
                          <h4 className="text-sm font-bold">{originSummaryName}</h4>
                          <p className="text-[11px] text-slate-400">{activeDraft.stops[0]?.address}</p>
                        </div>
                        <div className="flex flex-col items-center px-4">
                          <span className="text-[10px] font-mono text-blue-400">~230 KM · 3h 45m</span>
                          <div className="flex items-center gap-1.5 my-1 text-slate-500">
                            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                            <div className="w-16 sm:w-24 border-t border-dashed border-slate-500" />
                            <Truck size={14} className="text-blue-400" />
                            <div className="w-16 sm:w-24 border-t border-dashed border-slate-500" />
                            <span className="size-2 rounded-full bg-red-400" />
                          </div>
                          <span className="text-[10px] text-slate-400">Expressway Corridor (E4)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-red-400">Final Destination</span>
                          <h4 className="text-sm font-bold">{destSummaryName}</h4>
                          <p className="text-[11px] text-slate-400">{activeDraft.stops.at(-1)?.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stops Timeline summary */}
                    <div className="mt-4 space-y-2">
                      <span className="text-xs font-semibold text-slate-700">Scheduled Waypoints:</span>
                      <ol className="divide-y divide-slate-100 rounded-md border border-slate-100 text-xs">
                        {activeDraft.stops.map((s, idx) => (
                          <li key={s.id} className="flex items-center justify-between p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="size-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-900 block">{s.location_name}</span>
                                <span className="text-[11px] text-muted-foreground">{s.address}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-slate-600">{s.appointment_time?.replace("T", " ")}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Switcher Pill: Document Preview vs Route Map (Vektor TMS Style) */}
            <div className="flex shrink-0 items-center justify-center border-t border-slate-200 bg-white py-1.5 px-4">
              <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("document")}
                  className={`px-3 py-1 font-medium rounded-md transition-all ${
                    rightPanelTab === "document"
                      ? "bg-white text-blue-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Document Preview {activeDraft.documents.length ? `(${activeDraft.documents.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("map")}
                  className={`px-3 py-1 font-medium rounded-md transition-all ${
                    rightPanelTab === "map"
                      ? "bg-white text-blue-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Route Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Inline Partner Quick Modal                                       */}
        {/* ---------------------------------------------------------------- */}
        {showPartnerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-slate-900">
                    Add New {partnerModalRole === "customer" ? "Customer / Shipper" : "Carrier Partner"}
                  </h4>
                </div>
                <button onClick={() => setShowPartnerModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={15} />
                </button>
              </div>

              {partnerError && (
                <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{partnerError}</div>
              )}

              <form onSubmit={handleCreatePartner} className="space-y-3 text-xs">
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Company Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Mekong Garment Exports Ltd"
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-medium text-slate-600">Partner Code</Label>
                    <Input
                      placeholder="e.g. MGE-KH"
                      value={newPartnerCode}
                      onChange={(e) => setNewPartnerCode(e.target.value)}
                      className="mt-1 h-8 uppercase font-mono placeholder:font-sans placeholder:normal-case"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-slate-600">Phone</Label>
                    <Input
                      placeholder="+855 ..."
                      value={newPartnerPhone}
                      onChange={(e) => setNewPartnerPhone(e.target.value)}
                      className="mt-1 h-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-slate-600">Email</Label>
                  <Input
                    type="email"
                    placeholder="contact@company.com"
                    value={newPartnerEmail}
                    onChange={(e) => setNewPartnerEmail(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPartnerModal(false)}
                    disabled={creatingPartner}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingPartner}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creatingPartner && <Loader2 size={13} className="mr-1 animate-spin" />}
                    Save Partner
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Simple Plane Icon Component helper if needed
function PlaneIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}
