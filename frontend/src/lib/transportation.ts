import type { PartnerLocation, Partner } from "./partners";
import type { Shipment, ShipmentLeg } from "./freight";

export type Vehicle = {
  id: number;
  organization_id: number;
  carrier_partner_id: number | null;
  plate_number: string;
  type: "tractor_head" | "rigid_truck" | "container_chassis" | "flatbed_trailer" | "box_truck" | "van" | "other";
  ownership_type: "owned" | "leased" | "subcontracted";
  make_model: string;
  year: number | null;
  max_payload_kg: string | number;
  volume_capacity_cbm: string | number | null;
  current_status: "available" | "dispatched" | "maintenance" | "inactive";
  is_active: boolean;
  notes: string | null;
  created_at: string;
  carrier_partner?: Partner;
};

export type Driver = {
  id: number;
  organization_id: number;
  carrier_partner_id: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  license_number: string;
  license_type: "light_truck" | "heavy_truck" | "articulated_trailer" | "hazardous_materials";
  license_expires_at: string | null;
  current_status: "available" | "on_trip" | "rest_leave" | "inactive";
  is_active: boolean;
  notes: string | null;
  created_at: string;
  carrier_partner?: Partner;
};

export type DispatchTripLeg = {
  id: number;
  organization_id: number;
  dispatch_trip_id: number;
  shipment_leg_id: number;
  sequence: number;
  shipment_leg?: ShipmentLeg;
};

export type ProofOfDelivery = {
  id: number;
  organization_id: number;
  dispatch_trip_id: number;
  shipment_id: number;
  recipient_name: string;
  recipient_phone: string | null;
  delivered_at: string;
  signature_svg: string | null;
  photo_url: string | null;
  received_packages: number;
  damaged_packages: number;
  discrepancy_notes: string | null;
  signatory_remarks: string | null;
  created_at: string;
  shipment?: Shipment;
};

export type DispatchTrip = {
  id: number;
  organization_id: number;
  trip_number: string;
  carrier_partner_id: number | null;
  vehicle_id: number | null;
  trailer_vehicle_id: number | null;
  driver_id: number | null;
  secondary_driver_id: number | null;
  origin_location_id: number;
  destination_location_id: number;
  status: "draft" | "dispatched" | "loading" | "in_transit" | "unloading" | "completed" | "cancelled";
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  scheduled_end_time: string | null;
  actual_end_time: string | null;
  odometer_start_km: string | number | null;
  odometer_end_km: string | number | null;
  container_number: string | null;
  seal_number: string | null;
  notes: string | null;
  created_at: string;
  vehicle?: Vehicle;
  trailer_vehicle?: Vehicle;
  driver?: Driver;
  secondary_driver?: Driver;
  carrier_partner?: Partner;
  origin_location?: PartnerLocation;
  destination_location?: PartnerLocation;
  trip_legs_count?: number;
  proof_of_deliveries_count?: number;
  trip_legs?: DispatchTripLeg[];
  proof_of_deliveries?: ProofOfDelivery[];
};

export type TransportationCatalog = {
  vehicle_types: { value: string; label: string }[];
  ownership_types: { value: string; label: string }[];
  vehicle_statuses: { value: string; label: string }[];
  driver_license_types: { value: string; label: string }[];
  driver_statuses: { value: string; label: string }[];
  trip_statuses: { value: string; label: string }[];
  vehicles: Vehicle[];
  drivers: Driver[];
  locations: { id: number; name: string; type?: string; city: string; country_code: string }[];
  dispatchable_legs: (ShipmentLeg & { shipment?: Shipment })[];
};

export const transportRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/transport`;
