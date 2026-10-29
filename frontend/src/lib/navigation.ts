import {
  LayoutDashboard,
  PackageOpen,
  ClipboardList,
  BadgeDollarSign,
  CalendarCheck2,
  Package,
  Truck,
  Route,
  UsersRound,
  Warehouse,
  PackageCheck,
  Boxes,
  Files,
  FileStack,
  Globe2,
  Landmark,
  ListChecks,
  Handshake,
  ContactRound,
  Network,
  Wallet,
  ReceiptText,
  CreditCard,
  ChartNoAxesCombined,
  ChartColumn,
  Timer,
  CircleDollarSign,
  FileSearch,
  UserRoundCheck,
  Settings2,
  Building2,
  Users,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  permission?: string;
  description: string;
};
export type NavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
};
export const overview: NavigationItem = {
  id: "overview",
  label: "Overview",
  icon: LayoutDashboard,
  href: "/dashboard",
  description: "Your workspace dashboard and recent activity",
};
export const navigationGroups: NavigationGroup[] = [
  {
    id: "freight",
    label: "Freight Management",
    icon: PackageOpen,
    items: [
      {
        id: "requests",
        label: "Freight requests",
        icon: ClipboardList,
        href: "/freight/requests",
        permission: "freight.view",
        description: "Customer cargo and service requests",
      },
      {
        id: "quotations",
        label: "Quotations",
        icon: BadgeDollarSign,
        href: "/freight/quotations",
        permission: "freight.view",
        description: "Freight pricing and quotation versions",
      },
      {
        id: "bookings",
        label: "Orders & bookings",
        icon: CalendarCheck2,
        href: "/freight/bookings",
        permission: "freight.view",
        description: "Accepted services and commercial commitments",
      },
      {
        id: "shipments",
        label: "Shipments",
        icon: Package,
        href: "/freight/shipments",
        permission: "freight.view",
        description: "Cargo movements, parties and milestones",
      },
    ],
  },
  {
    id: "transportation",
    label: "Transportation",
    icon: Truck,
    items: [
      {
        id: "trips",
        label: "Dispatch run-sheets",
        icon: Route,
        href: "/transport/trips",
        permission: "transport.view",
        description: "Trip planning, route dispatch and digital PODs",
      },
      {
        id: "fleet",
        label: "Vehicles & fleet",
        icon: Truck,
        href: "/transport/fleet",
        permission: "transport.view",
        description: "Trucks, trailers and equipment registry",
      },
      {
        id: "drivers",
        label: "Drivers registry",
        icon: UsersRound,
        href: "/transport/drivers",
        permission: "transport.view",
        description: "Driver roster, licenses and duty status",
      },
    ],
  },
  {
    id: "warehousing",
    label: "Warehousing",
    icon: Warehouse,
    items: [
      {
        id: "receiving",
        label: "Receiving & outbound",
        icon: PackageCheck,
        description: "Goods receipts, discrepancies and handover",
      },
      {
        id: "inventory",
        label: "Inventory",
        icon: Boxes,
        description: "Physical stock and movement history",
      },
    ],
  },
  {
    id: "trade",
    label: "Trade & Documents",
    icon: Files,
    items: [
      {
        id: "documents",
        label: "Document center",
        icon: FileStack,
        href: "/documents",
        permission: "documents.view",
        description: "Trade documents vault, extraction and line item review",
      },
      {
        id: "reconciliation",
        label: "Reconciliation Studio",
        icon: ListChecks,
        href: "/documents/reconciliation",
        permission: "documents.view",
        description: "Cross-document reconciliation and cargo manifest sync",
      },
      {
        id: "trade-jobs",
        label: "Import / export",
        icon: Globe2,
        description: "International jobs and trade milestones",
      },
      {
        id: "customs",
        label: "Customs & ASYCUDA",
        icon: Landmark,
        href: "/customs",
        permission: "customs.view",
        description: "ASYCUDA SAD declarations, inspection lanes and clearance status",
      },
      {
        id: "cdc-quotas",
        label: "CDC Master Lists & Quota",
        icon: Files,
        href: "/customs/cdc",
        permission: "customs.view",
        description: "QIP duty-free master lists, item quotas and remaining balances",
      },
      {
        id: "cdc-deductions",
        label: "Quota Deductions Ledger",
        icon: ListChecks,
        href: "/customs/deductions",
        permission: "customs.view",
        description: "Immutable cut-stock deduction ledger across all shipments",
      },
      {
        id: "cdc",
        label: "CDC reconciliation",
        icon: ListChecks,
        description: "Controlled Master List review and reconciliation",
      },
    ],
  },
  {
    id: "network",
    label: "Business Network",
    icon: Handshake,
    items: [
      {
        id: "partners",
        label: "Business partners",
        icon: Building2,
        href: "/partners",
        permission: "partners.view",
        description: "Your private customer and partner directory",
      },
      {
        id: "contacts",
        label: "Contacts & locations",
        icon: ContactRound,
        href: "/network/contacts-locations",
        permission: "partners.view",
        description: "Find partner contacts, addresses and business sites",
      },
      {
        id: "connections",
        label: "Partner connections",
        icon: Network,
        description: "Verified collaboration with other organizations",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    items: [
      {
        id: "charges",
        label: "Charges & expenses",
        icon: ReceiptText,
        description: "Operational revenue, costs and charges",
      },
      {
        id: "invoices",
        label: "Invoices & payables",
        icon: CreditCard,
        description: "Customer invoices, vendor bills and payments",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ChartNoAxesCombined,
    items: [
      {
        id: "shipment-report",
        label: "Shipment performance",
        icon: ChartColumn,
        description: "Shipment outcomes and service performance",
      },
      {
        id: "transport-report",
        label: "Transport performance",
        icon: Timer,
        description: "On-time delivery and carrier performance",
      },
      {
        id: "financial-report",
        label: "Financial performance",
        icon: CircleDollarSign,
        description: "Revenue, costs and profitability",
      },
      {
        id: "warehouse-report",
        label: "Warehouse report",
        icon: Warehouse,
        description: "Stock movements and discrepancies",
      },
      {
        id: "document-report",
        label: "Document report",
        icon: FileSearch,
        description: "Missing documents and review exceptions",
      },
      {
        id: "customer-report",
        label: "Customer performance",
        icon: UserRoundCheck,
        description: "Customer volumes and service outcomes",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    items: [
      {
        id: "organizations",
        label: "Organizations",
        icon: Building2,
        href: "/organizations",
        description: "Create and manage your organization workspaces",
      },
      {
        id: "profile",
        label: "Organization profile",
        icon: Building2,
        href: "/settings",
        permission: "organization.view",
        description: "Company information and regional preferences",
      },
      {
        id: "team",
        label: "Team members",
        icon: Users,
        href: "/team",
        permission: "team.view",
        description: "People, invitations and membership roles",
      },
      {
        id: "departments",
        label: "Departments",
        icon: Network,
        href: "/departments",
        permission: "departments.view",
        description: "Your organization's teams and departments",
      },
      {
        id: "permissions",
        label: "Roles & permissions",
        icon: ShieldCheck,
        href: "/settings/permissions",
        permission: "organization.view",
        description: "Understand workspace roles and their permissions",
      },
      {
        id: "activity",
        label: "Activity log",
        icon: ScrollText,
        href: "/audit",
        permission: "audit.view",
        description: "Audited changes to this organization",
      },
    ],
  },
];
export function itemMatchesPath(item: NavigationItem, path: string): boolean {
  if (!item.href) return false;
  if (item.id === "partners")
    return path === "/partners" || path.startsWith("/partners/");
  if (item.id === "organizations")
    return path === "/organizations" || path.startsWith("/organizations/");
  return path === item.href;
}
export function navigationLocation(path: string) {
  if (itemMatchesPath(overview, path))
    return { group: "Workspace", label: overview.label };
  for (const group of navigationGroups) {
    const item = group.items.find((item) => itemMatchesPath(item, path));
    if (item) return { group: group.label, label: item.label };
  }
  return { group: "Workspace", label: "Workspace" };
}
