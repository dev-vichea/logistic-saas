export type RecordKind = "material-request" | "purchase-order";

export type OpenRecord = {
  kind: RecordKind;
  id: number;
  label: string;
  title: string;
  href: string;
};

export type RecordActivity = {
  id: number;
  action: string;
  created_at: string;
  actor_name?: string | null;
};

export type RecordDocument = {
  id: number;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by?: { id: number; name: string } | null;
};

export function recordActivityLabel(action: string): string {
  const labels: Record<string, string> = {
    "material_request.created": "Material request created",
    "material_request.updated": "Material request updated",
    "material_request.submitted": "Material request submitted",
    "purchase_order.created": "Purchase order created",
    "purchase_order.updated": "Purchase order updated",
    "purchase_order.issued": "Purchase order issued",
    "record_document.uploaded": "Document uploaded",
    "record_document.deleted": "Document removed",
  };
  return labels[action] ?? action.replaceAll("_", " ").replaceAll(".", " · ");
}
