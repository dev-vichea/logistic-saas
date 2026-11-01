export type PurchaseOrderItem = {
  id: number;
  material_request_item_id: number;
  line_number: number;
  description: string;
  specification: string | null;
  quantity: string | number;
  unit: string;
  unit_price: string | number;
};

export type PurchaseOrder = {
  id: number;
  po_number: string;
  material_request_id: number;
  supplier_partner_id: number;
  supplier_name: string;
  status: "draft" | "issued";
  currency: string;
  expected_delivery_date: string | null;
  notes: string | null;
  issued_at: string | null;
  created_at: string;
  total_amount?: string | number | null;
  items_count?: number;
  items?: PurchaseOrderItem[];
  material_request?: { id: number; request_number: string; title: string; needed_by?: string | null };
  supplier?: { id: number; name: string; code: string | null };
  created_by?: { id: number; name: string };
};

export const purchaseOrdersRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/purchase-orders`;
