export type FreightRequest = {
  id: number;
  organization_id: number;
  request_number: string;
  customer_id: number;
  shipper_id: number | null;
  consignee_id: number | null;
  origin_location_id: number;
  destination_location_id: number;
  transport_mode: "road" | "ocean_fcl" | "ocean_lcl" | "air" | "multimodal";
  incoterm: string | null;
  status: "draft" | "submitted" | "reviewing" | "quoted" | "cancelled";
  cargo_description: string | null;
  package_type: string | null;
  total_pieces: number;
  total_weight_kg: string | number;
  total_volume_cbm: string | number;
  is_dangerous: boolean;
  is_temperature_controlled: boolean;
  target_readiness_date: string | null;
  target_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  customer?: { id: number; name: string; code: string | null };
  origin_location?: { id: number; name: string; city: string; country_code: string };
  destination_location?: { id: number; name: string; city: string; country_code: string };
};

export type QuotationLineItem = {
  id: number;
  quotation_id: number;
  description: string;
  charge_type: string;
  quantity: string | number;
  unit_price: string | number;
  total_amount: string | number;
  currency: string;
};

export type Quotation = {
  id: number;
  organization_id: number;
  quotation_number: string;
  revision: number;
  freight_request_id: number | null;
  customer_id: number;
  origin_location_id: number;
  destination_location_id: number;
  transport_mode: "road" | "ocean_fcl" | "ocean_lcl" | "air" | "multimodal";
  incoterm: string | null;
  currency: string;
  subtotal_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  valid_until: string | null;
  terms_and_conditions: string | null;
  notes: string | null;
  created_at: string;
  customer?: { id: number; name: string; code: string | null };
  origin_location?: { id: number; name: string; city: string; country_code: string };
  destination_location?: { id: number; name: string; city: string; country_code: string };
  line_items?: QuotationLineItem[];
};

export type CargoItem = {
  id: number;
  description: string;
  commodity: string | null;
  hs_code: string | null;
  package_type: string;
  quantity: number;
  container_number: string | null;
  seal_number: string | null;
  length_cm: string | number | null;
  width_cm: string | number | null;
  height_cm: string | number | null;
  gross_weight_kg: string | number;
  net_weight_kg: string | number;
  volume_cbm: string | number;
  is_dangerous: boolean;
  un_number: string | null;
  is_temperature_controlled: boolean;
};

export type Booking = {
  id: number;
  organization_id: number;
  booking_number: string;
  quotation_id: number | null;
  customer_id: number;
  origin_location_id: number;
  destination_location_id: number;
  transport_mode: "road" | "ocean_fcl" | "ocean_lcl" | "air" | "multimodal";
  incoterm: string | null;
  customer_reference: string | null;
  status: "draft" | "confirmed" | "in_progress" | "completed" | "cancelled";
  total_amount: string | number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  customer?: { id: number; name: string; code: string | null };
  origin_location?: { id: number; name: string; city: string; country_code: string };
  destination_location?: { id: number; name: string; city: string; country_code: string };
  cargo_items_count?: number;
  shipments_count?: number;
  cargo_items?: CargoItem[];
};

export type ShipmentLeg = {
  id: number;
  shipment_id: number;
  sequence: number;
  leg_type: "pre_carriage" | "main_carriage" | "on_carriage" | "customs_inspection";
  transport_mode: "road" | "ocean" | "air" | "rail";
  carrier_id: number | null;
  origin_location_id: number;
  destination_location_id: number;
  vessel_or_flight_or_plate: string | null;
  voyage_or_trip_number: string | null;
  scheduled_departure: string | null;
  actual_departure: string | null;
  scheduled_arrival: string | null;
  actual_arrival: string | null;
  status: "scheduled" | "loading" | "in_transit" | "arrived" | "completed" | "exception";
  notes: string | null;
  carrier?: { id: number; name: string; code: string | null };
  origin_location?: { id: number; name: string; city: string; country_code: string };
  destination_location?: { id: number; name: string; city: string; country_code: string };
  shipment?: Shipment;
};

export type ShipmentParticipant = {
  id: number;
  shipment_id: number;
  business_partner_id: number;
  connected_organization_id: number | null;
  role: "shipper" | "consignee" | "carrier" | "customs_broker" | "forwarder" | "notify_party";
  notes: string | null;
  partner?: { id: number; name: string; code: string | null; roles: string[] };
  connected_organization?: { id: number; name: string };
};

export type ShipmentMilestone = {
  id: number;
  shipment_id: number;
  shipment_leg_id: number | null;
  code: string;
  title: string;
  description: string | null;
  location_name: string | null;
  location_id: number | null;
  occurred_at: string;
  is_exception: boolean;
  created_by_user?: { id: number; name: string };
};

export type Shipment = {
  id: number;
  organization_id: number;
  shipment_number: string;
  booking_id: number | null;
  customer_id: number;
  carrier_id: number | null;
  origin_location_id: number;
  destination_location_id: number;
  transport_mode: "road" | "ocean_fcl" | "ocean_lcl" | "air" | "multimodal";
  master_tracking_number: string | null;
  status: "draft" | "planned" | "dispatched" | "in_transit" | "arrived_hub" | "out_for_delivery" | "delivered" | "closed" | "cancelled";
  customs_status: "not_applicable" | "pending_docs" | "declaration_drafted" | "under_inspection" | "cleared" | "released";
  commercial_status: "pending" | "quoted" | "confirmed" | "invoiced" | "paid";
  etd: string | null;
  atd: string | null;
  eta: string | null;
  ata: string | null;
  special_instructions: string | null;
  notes: string | null;
  created_at: string;
  customer?: { id: number; name: string; code: string | null };
  carrier?: { id: number; name: string; code: string | null };
  origin_location?: { id: number; name: string; city: string; country_code: string };
  destination_location?: { id: number; name: string; city: string; country_code: string };
  cargo_items_count?: number;
  legs_count?: number;
  milestones_count?: number;
  cargo_items?: CargoItem[];
  legs?: ShipmentLeg[];
  participants?: ShipmentParticipant[];
  milestones?: ShipmentMilestone[];
};

export type FreightCatalog = {
  locations: { id: number; name: string; type?: string; city: string; country_code: string }[];
  transport_modes: { value: string; label: string }[];
  incoterms: string[];
  package_types: string[];
  charge_types: { value: string; label: string }[];
  leg_types: { value: string; label: string }[];
  operational_statuses: { value: string; label: string }[];
  customs_statuses: { value: string; label: string }[];
  milestone_presets: { code: string; title: string }[];
};

export const freightRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/freight`;
