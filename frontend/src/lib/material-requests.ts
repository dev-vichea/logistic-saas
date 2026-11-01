export type MaterialRequestItem = {
  id: number;
  line_number: number;
  description: string;
  specification: string | null;
  quantity: string | number;
  unit: string;
};

export type MaterialRequest = {
  id: number;
  request_number: string;
  title: string;
  needed_by: string | null;
  notes: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
  items_count?: number;
  items?: MaterialRequestItem[];
  requested_by?: { id: number; name: string };
  purchase_order?: { id: number; po_number: string; status: "draft" | "issued" } | null;
};

export const materialRequestsRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/material-requests`;
