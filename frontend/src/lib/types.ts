export type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
};
export type Organization = {
  id: number;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  tax_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country_code: string;
  timezone: string;
  currency: string;
  activities: string[];
  role: string;
  permissions: string[];
};
export type Catalog = {
  countries: Record<string, string>;
  currencies: string[];
  activities: Record<string, string>;
  roles: { value: string; permissions: string[] }[];
};
export type Department = {
  id: number;
  name: string;
  description: string | null;
};
export type Member = {
  id: number;
  role: string;
  department_id: number | null;
  user: User;
  department: Department | null;
};
export type Invitation = {
  id: number;
  email: string;
  role: string;
  department_id: number | null;
  expires_at: string;
};
export type AuditEvent = {
  id: number;
  action: string;
  actor_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};
