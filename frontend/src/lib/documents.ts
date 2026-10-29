import type { Shipment } from "./freight";

export type TradeDocumentType =
  | "commercial_invoice"
  | "packing_list"
  | "bill_of_lading"
  | "cdc_master_list"
  | "delivery_order"
  | "customs_declaration"
  | "other";

export type TradeDocumentStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "reconciled"
  | "flagged"
  | "verified"
  | "error";

export type ItemMatchStatus =
  | "unmatched"
  | "matched"
  | "discrepancy"
  | "manual_override"
  | "confirmed";

export type TradeDocumentItem = {
  id: number;
  organization_id: number;
  trade_document_id: number;
  line_number: number;
  item_code: string | null;
  hs_code: string | null;
  description_original: string | null;
  description_english: string;
  quantity: string | number;
  unit_of_measure: string;
  unit_price: string | number | null;
  total_amount: string | number | null;
  package_count: number | null;
  package_type: string | null;
  gross_weight_kg: string | number | null;
  net_weight_kg: string | number | null;
  volume_cbm: string | number | null;
  match_status: ItemMatchStatus;
  discrepancy_details: string[] | null;
  raw_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type TradeDocument = {
  id: number;
  organization_id: number;
  shipment_id: number | null;
  document_number: string | null;
  document_type: TradeDocumentType;
  file_name: string;
  file_path: string | null;
  file_size_bytes: number;
  mime_type: string;
  language: string;
  status: TradeDocumentStatus;
  confidence_score: string | number | null;
  extracted_metadata: {
    invoice_no?: string;
    invoice_date?: string;
    contract_no?: string;
    supplier?: string;
    consignee?: string;
    origin?: string;
    destination?: string;
    currency?: string;
    vessel_voyage?: string;
    port_of_loading?: string;
    port_of_discharge?: string;
    container_number?: string;
    seal_number?: string;
    printed_totals?: {
      packages?: number;
      gross_weight?: number;
      net_weight?: number;
      volume?: number;
    };
  } | null;
  raw_content?: string | null;
  notes: string | null;
  created_by_user_id: number | null;
  verified_by_user_id: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
  items?: TradeDocumentItem[];
  shipment?: Shipment;
  created_by_user?: { id: number; name: string };
  verified_by_user?: { id: number; name: string };
};

export type ReconciliationPair = {
  invoice_item: TradeDocumentItem | null;
  packing_item: TradeDocumentItem | null;
  status: "matched" | "discrepancy";
  issues: string[];
};

export type DocumentReconciliation = {
  id: number;
  organization_id: number;
  shipment_id: number | null;
  invoice_document_id: number;
  packing_list_document_id: number;
  status: "balanced" | "has_discrepancies" | "resolved";
  total_invoice_items: number;
  total_packing_items: number;
  matched_items_count: number;
  discrepancy_count: number;
  invoice_total_quantity: string | number;
  packing_total_quantity: string | number;
  invoice_total_gross_weight: string | number | null;
  packing_total_gross_weight: string | number | null;
  discrepancies: string[] | null;
  pairs: ReconciliationPair[] | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  invoice_document?: TradeDocument;
  packing_list_document?: TradeDocument;
  shipment?: Shipment;
  reviewed_by_user?: { id: number; name: string };
};

export type DocumentCatalog = {
  shipments: Array<{
    id: number;
    shipment_number: string;
    status: string;
    transport_mode: string;
  }>;
  stats: {
    total_documents: number;
    reconciled: number;
    flagged: number;
    verified: number;
    total_reconciliations: number;
    unresolved_reconciliations: number;
  };
  document_types: Array<{ value: TradeDocumentType; label: string }>;
};

export function documentTypeLabel(type: TradeDocumentType): string {
  switch (type) {
    case "commercial_invoice":
      return "Commercial Invoice";
    case "packing_list":
      return "Packing List";
    case "bill_of_lading":
      return "Bill of Lading (B/L)";
    case "cdc_master_list":
      return "CDC Master List";
    case "delivery_order":
      return "Delivery Order (D/O)";
    case "customs_declaration":
      return "Customs Declaration";
    default:
      return "Trade Document";
  }
}

export const documentsRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/documents`;

