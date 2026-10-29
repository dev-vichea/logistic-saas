import type { Shipment } from "./freight";

export type CdcMasterItemCategory =
  | "machinery_equipment"
  | "raw_materials"
  | "accessories"
  | "other";

export type CdcMasterItem = {
  id: number;
  organization_id: number;
  cdc_master_list_id: number;
  category: CdcMasterItemCategory | string;
  item_number: number;
  description_original: string | null;
  description_english: string;
  hs_code: string | null;
  model_specification: string | null;
  unit_of_measure: string;
  approved_quantity: string | number;
  consumed_quantity: string | number;
  remaining_quantity: string | number;
  unit_price_usd: string | number;
  total_price_usd: string | number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type CdcMasterList = {
  id: number;
  organization_id: number;
  qip_number: string;
  company_name: string;
  tin_number: string | null;
  approval_reference: string;
  effective_year: number;
  valid_from: string | null;
  valid_until: string | null;
  status: "active" | "expired" | "suspended";
  notes: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
  items?: CdcMasterItem[];
};

export type CustomsDeclarationStatus =
  | "draft"
  | "cdc_deducted"
  | "lodged"
  | "under_inspection"
  | "cleared"
  | "released"
  | "rejected";

export type InspectionLane = "green" | "blue" | "yellow" | "red";

export type CustomsDeclarationItem = {
  id: number;
  organization_id: number;
  customs_declaration_id: number;
  cdc_master_item_id: number | null;
  item_number: number;
  hs_code: string;
  description: string;
  quantity: string | number;
  unit_of_measure: string;
  gross_weight_kg: string | number;
  net_weight_kg: string | number;
  customs_value_usd: string | number;
  duty_rate_percent: string | number;
  is_duty_exempt: boolean;
  exempt_amount_usd: string | number;
  notes: string | null;
  cdc_master_item?: CdcMasterItem;
};

export type CdcQuotaDeduction = {
  id: number;
  organization_id: number;
  cdc_master_item_id: number;
  customs_declaration_id: number | null;
  customs_declaration_item_id: number | null;
  shipment_id: number | null;
  deduction_reference: string;
  deducted_quantity: string | number;
  balance_before: string | number;
  balance_after: string | number;
  deducted_at: string;
  notes: string | null;
  created_by_user_id: number | null;
  cdc_master_item?: CdcMasterItem;
  customs_declaration?: {
    id: number;
    declaration_number: string;
    customs_office_code: string;
    status: CustomsDeclarationStatus;
  };
  created_by_user?: {
    id: number;
    name: string;
  };
};

export type CustomsDeclaration = {
  id: number;
  organization_id: number;
  shipment_id: number | null;
  cdc_master_list_id: number | null;
  declaration_number: string;
  declaration_date: string;
  declaration_type: "import" | "export" | "transit";
  customs_office_code: string;
  regime_code: string;
  status: CustomsDeclarationStatus;
  inspection_lane: InspectionLane;
  declarant_partner_id: number | null;
  consignee_partner_id: number | null;
  invoice_number: string | null;
  bill_of_lading_number: string | null;
  total_packages: number;
  total_gross_weight_kg: string | number;
  total_net_weight_kg: string | number;
  customs_value_usd: string | number;
  duty_exemption_amount_usd: string | number;
  payable_duty_usd: string | number;
  payable_vat_usd: string | number;
  cleared_at: string | null;
  released_at: string | null;
  notes: string | null;
  items_count?: number;
  items?: CustomsDeclarationItem[];
  deductions?: CdcQuotaDeduction[];
  shipment?: Shipment;
  cdc_master_list?: CdcMasterList;
  declarant_partner?: { id: number; name: string };
  consignee_partner?: { id: number; name: string };
};

export type CustomsCatalog = {
  stats: {
    total_declarations: number;
    cleared_declarations: number;
    under_inspection: number;
    total_cdc_lists: number;
    total_cdc_exemption_usd: number;
  };
  customs_offices: Array<{ code: string; name: string; city: string }>;
  regimes: Array<{ code: string; name: string }>;
  inspection_lanes: Array<{ lane: InspectionLane; label: string }>;
  declaration_statuses: Array<{ value: CustomsDeclarationStatus; label: string }>;
  cdc_master_lists: CdcMasterList[];
  shipments: Array<{
    id: number;
    shipment_number: string;
    status: string;
    transport_mode: string;
    customs_status: string;
  }>;
  brokers: Array<{ id: number; name: string }>;
};

export const customsRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/customs`;

export function laneColor(lane?: InspectionLane | string | null): {
  badge: string;
  border: string;
  label: string;
  text: string;
} {
  switch (lane) {
    case "green":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        border: "border-emerald-500",
        label: "Green Lane",
        text: "Direct Release / Fast Track",
      };
    case "blue":
      return {
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        border: "border-blue-500",
        label: "Blue Lane",
        text: "Post-Clearance Audit (PCA)",
      };
    case "yellow":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        border: "border-amber-500",
        label: "Yellow Lane",
        text: "Documentary Check & Valuation",
      };
    case "red":
      return {
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        border: "border-rose-500",
        label: "Red Lane",
        text: "Physical Cargo & Scanner Inspection",
      };
    default:
      return {
        badge: "bg-slate-50 text-slate-600 border-slate-200",
        border: "border-slate-400",
        label: lane ? String(lane).toUpperCase() : "Unassigned",
        text: "Pending Inspection Assignment",
      };
  }
}

export function declarationStatusInfo(status?: CustomsDeclarationStatus | string | null): {
  label: string;
  badge: string;
} {
  switch (status) {
    case "draft":
      return { label: "Draft", badge: "bg-slate-100 text-slate-700 border-slate-200" };
    case "cdc_deducted":
      return { label: "CDC Deducted", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    case "lodged":
      return { label: "ASYCUDA Lodged", badge: "bg-sky-50 text-sky-700 border-sky-200" };
    case "under_inspection":
      return { label: "Under Inspection", badge: "bg-amber-50 text-amber-700 border-amber-200" };
    case "cleared":
      return { label: "Customs Cleared", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "released":
      return { label: "Gate Released", badge: "bg-teal-50 text-teal-700 border-teal-200" };
    case "rejected":
      return { label: "Rejected", badge: "bg-rose-50 text-rose-700 border-rose-200" };
    default:
      return {
        label: status
          ? String(status)
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : "Draft",
        badge: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}
