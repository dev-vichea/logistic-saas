import type { Paginated } from "@/lib/types";
export type Partner = {
  id: number;
  organization_id: number;
  name: string;
  legal_name: string | null;
  code: string | null;
  roles: string[];
  country_code: string;
  registration_number: string | null;
  tax_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  contacts_count: number;
  locations_count: number;
};
export type PartnerContact = {
  id: number;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_primary: boolean;
};
export type PartnerLocation = {
  id: number;
  name: string;
  type: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  is_primary: boolean;
};
export type PartnerCatalog = {
  countries: Record<string, string>;
  roles: Record<string, string>;
  location_types: Record<string, string>;
};
export type PartnerPage = Paginated<Partner>;
export const partnerRoot = (organizationId: number) =>
  `/api/v1/organizations/${organizationId}/partners`;
