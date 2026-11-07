import {
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  BadgeDollarSign,
  Briefcase,
  Package,
  CalendarCheck2,
  Radar,
  Route,
  LayoutGrid,
  CalendarDays,
  FileText,
  ScrollText,
  Map,
  Truck,
  UsersRound,
  Wrench,
  Landmark,
  FileStack,
  ShieldCheck as ShieldCheckIcon,
  Inbox,
  ScanSearch,
  FolderOpen,
  Receipt,
  CreditCard,
  Wallet,
  Banknote,
  Building2,
  ContactRound,
  Handshake,
  MapPin,
  ChartNoAxesCombined,
  Settings2,
  Users,
  Share2,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  permission?: string;
  description: string;
  badge?: string;
  children?: NavigationItem[];
};

export type NavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
  defaultOpen?: boolean;
};

export type NavigationSection = {
  id: string;
  title: string;
  items?: NavigationItem[];
  groups?: NavigationGroup[];
};

// ─── WORKSPACE ──────────────────────────────────────────────────────

export const dashboardNav: NavigationItem = {
  id: "dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  href: "/dashboard",
  description: "Operations dashboard, active movements, and KPIs",
};

export const myTasksNav: NavigationItem = {
  id: "my-tasks",
  label: "My Tasks",
  icon: ListChecks,
  description: "Your assigned operational actions and document verifications",
  badge: "3",
};

// ─── COMMERCIAL ─────────────────────────────────────────────────────

export const commercialItems: NavigationItem[] = [
  {
    id: "requests",
    label: "Requests",
    icon: ClipboardList,
    href: "/freight/requests",
    permission: "freight.view",
    description: "Customer freight requests and cargo quotes",
  },
  {
    id: "quotations",
    label: "Quotations",
    icon: BadgeDollarSign,
    href: "/freight/quotations",
    permission: "freight.view",
    description: "Pricing calculations and commercial offers",
  },
  {
    id: "service-jobs",
    label: "Service Jobs",
    icon: Briefcase,
    href: "/freight/bookings",
    permission: "freight.view",
    description: "Accepted orders, bookings and operational jobs",
  },
];

// ─── OPERATIONS ─────────────────────────────────────────────────────

export const operationsGroups: NavigationGroup[] = [
  {
    id: "shipments",
    label: "Shipments",
    icon: Package,
    defaultOpen: true,
    items: [
      {
        id: "all-shipments",
        label: "All Shipments",
        icon: Package,
        href: "/freight/shipments",
        permission: "freight.view",
        description: "All multimodal freight shipments and status tracker",
      },
      {
        id: "bookings",
        label: "Bookings",
        icon: CalendarCheck2,
        href: "/freight/bookings",
        permission: "freight.view",
        description: "Carrier bookings and confirmation numbers",
      },
      {
        id: "tracking",
        label: "Tracking",
        icon: Radar,
        href: "/freight/shipments?view=tracking",
        permission: "freight.view",
        description: "Real-time vessel, container and route tracking",
      },
    ],
  },
  {
    id: "dispatch",
    label: "Dispatch",
    icon: Route,
    defaultOpen: false,
    items: [
      {
        id: "dispatch-board",
        label: "Dispatch Board",
        icon: LayoutGrid,
        description: "Interactive fleet schedule and carrier allocation board",
      },
      {
        id: "dispatch-schedule",
        label: "Schedule",
        icon: CalendarDays,
        description: "Pickup and delivery calendar schedule",
      },
      {
        id: "transport-orders",
        label: "Transport Orders",
        icon: FileText,
        description: "Leg assignments and driver haulage instructions",
      },
      {
        id: "tenders",
        label: "Tenders",
        icon: ScrollText,
        description: "Spot market bids and subcontracted carrier tenders",
      },
      {
        id: "manifests",
        label: "Manifests",
        icon: ClipboardList,
        description: "LTL and groupage consolidation manifests",
      },
      {
        id: "trips",
        label: "Trips",
        icon: Map,
        href: "/transport/trips",
        permission: "transport.view",
        description: "Active truck runs, waypoint checklists and digital PODs",
        badge: "Live",
      },
    ],
  },
  {
    id: "fleet",
    label: "Fleet",
    icon: Truck,
    defaultOpen: false,
    items: [
      {
        id: "vehicles",
        label: "Vehicles & Trailers",
        icon: Truck,
        href: "/transport/fleet",
        permission: "transport.view",
        description: "Prime movers, chassis, containers and trailers",
      },
      {
        id: "drivers",
        label: "Drivers",
        icon: UsersRound,
        href: "/transport/drivers",
        permission: "transport.view",
        description: "Driver roster, licenses, phone contacts and shifts",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        icon: Wrench,
        description: "Service intervals, roadworthiness checks and repairs",
      },
    ],
  },
  {
    id: "customs",
    label: "Customs Clearance",
    icon: Landmark,
    defaultOpen: false,
    items: [
      {
        id: "clearance-jobs",
        label: "Clearance Jobs",
        icon: Landmark,
        href: "/customs",
        permission: "customs.view",
        description: "ASYCUDA SAD entries, inspection lanes and clearance",
      },
      {
        id: "declarations",
        label: "Declarations",
        icon: FileStack,
        href: "/customs/cdc",
        permission: "customs.view",
        description: "QIP duty-free CDC Master Lists and quota deductions",
      },
      {
        id: "permits",
        label: "Permits",
        icon: ShieldCheckIcon,
        description: "Ministry import/export certificates and border permits",
      },
    ],
  },
];

// ─── BUSINESS ───────────────────────────────────────────────────────

export const businessGroups: NavigationGroup[] = [
  {
    id: "documents",
    label: "Documents",
    icon: FolderOpen,
    defaultOpen: false,
    items: [
      {
        id: "document-inbox",
        label: "Document Inbox",
        icon: Inbox,
        href: "/documents",
        permission: "documents.view",
        description: "Incoming shipment files, B/L, invoices & packing lists",
      },
      {
        id: "ocr-verification",
        label: "OCR Verification",
        icon: ScanSearch,
        href: "/documents/reconciliation",
        permission: "documents.view",
        description: "Document reconciliation studio and extracted data audit",
      },
      {
        id: "document-library",
        label: "Document Library",
        icon: FolderOpen,
        description: "Centralized document vault across all entities",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: Wallet,
    defaultOpen: false,
    items: [
      {
        id: "charges",
        label: "Charges",
        icon: Receipt,
        description: "Demurrage, detention, freight tariffs and handling fees",
      },
      {
        id: "customer-invoices",
        label: "Customer Invoices",
        icon: CreditCard,
        description: "Sales invoices and commercial billing",
      },
      {
        id: "vendor-bills",
        label: "Vendor Bills",
        icon: Wallet,
        description: "Carrier freight bills and subcontractor payables",
      },
      {
        id: "payments",
        label: "Payments",
        icon: Banknote,
        description: "Incoming and outgoing wire reconciliations",
      },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: Handshake,
    defaultOpen: false,
    items: [
      {
        id: "customers",
        label: "Customers",
        icon: Building2,
        href: "/partners",
        permission: "partners.view",
        description: "Shippers, consignees and billing accounts",
      },
      {
        id: "carriers",
        label: "Carriers",
        icon: Truck,
        permission: "partners.view",
        description: "Shipping lines, airlines, truckers and rail operators",
      },
      {
        id: "brokers",
        label: "Brokers",
        icon: ContactRound,
        permission: "partners.view",
        description: "Licensed customs brokers and forwarding agents",
      },
      {
        id: "partners-directory",
        label: "Partners",
        icon: Handshake,
        href: "/network/contacts-locations",
        permission: "partners.view",
        description: "All contacts, facilities, warehouses and sites",
      },
      {
        id: "locations",
        label: "Locations",
        icon: MapPin,
        permission: "partners.view",
        description: "Ports, border gates, container depots and hubs",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ChartNoAxesCombined,
    defaultOpen: false,
    items: [
      {
        id: "reports-overview",
        label: "Reports",
        icon: ChartNoAxesCombined,
        description: "Operational profitability, TEU throughput and OTP metrics",
      },
    ],
  },
];

// ─── SYSTEM ─────────────────────────────────────────────────────────

export const systemGroups: NavigationGroup[] = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    defaultOpen: false,
    items: [
      {
        id: "organizations",
        label: "Organizations",
        icon: Building2,
        href: "/organizations",
        description: "Company legal entities, registration TIN and regional hubs",
      },
      {
        id: "team-permissions",
        label: "Team & Permissions",
        icon: Users,
        href: "/team",
        permission: "team.view",
        description: "User memberships, departments and role permission matrix",
      },
      {
        id: "shared-access",
        label: "Shared Access",
        icon: Share2,
        description: "Cross-organization collaboration and record sharing rules",
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
        href: "/audit",
        permission: "audit.view",
        description: "Immutable security audit log and mutation events",
      },
    ],
  },
];

// ─── OPTIONAL PROCUREMENT (PRESERVED) ───────────────────────────────

export const procurementItems: NavigationItem[] = [
  {
    id: "material-requests",
    label: "Material Requests",
    icon: ClipboardList,
    href: "/material-requests",
    permission: "material_requests.view",
    description: "Internal requisition of factory parts and raw materials",
  },
  {
    id: "purchase-orders",
    label: "Purchase Orders",
    icon: ShoppingCart,
    href: "/purchase-orders",
    permission: "purchase_orders.view",
    description: "Factory supplier purchase orders and line items",
  },
];

// ─── AGGREGATE GROUPS (FOR SEARCH & BACKWARDS COMPATIBILITY) ────────

export const navigationGroups: NavigationGroup[] = [
  {
    id: "commercial",
    label: "Commercial",
    icon: BadgeDollarSign,
    items: commercialItems,
  },
  ...operationsGroups,
  ...businessGroups,
  ...systemGroups,
];

// ─── COMPREHENSIVE SECTIONS ─────────────────────────────────────────

export const navigationSections: NavigationSection[] = [
  {
    id: "workspace",
    title: "WORKSPACE",
    items: [dashboardNav, myTasksNav],
  },
  {
    id: "commercial",
    title: "COMMERCIAL",
    items: commercialItems,
  },
  {
    id: "operations",
    title: "OPERATIONS",
    groups: operationsGroups,
  },
  {
    id: "business",
    title: "BUSINESS",
    groups: businessGroups,
  },
  {
    id: "system",
    title: "SYSTEM",
    groups: systemGroups,
  },
];

// ─── BACKWARDS COMPATIBILITY EXPORTS ────────────────────────────────

export const overview = dashboardNav;
export const materialRequestsNav = procurementItems[0];
export const purchaseOrdersNav = procurementItems[1];

// ─── ROUTE MATCHING HELPER ──────────────────────────────────────────

export function itemMatchesPath(item: NavigationItem, path: string): boolean {
  if (!item.href) return false;
  if (item.id === "dashboard") {
    return path === "/dashboard";
  }
  if (item.id === "all-shipments") {
    return path.startsWith("/freight/shipments");
  }
  if (item.id === "bookings" || item.id === "service-jobs") {
    return path.startsWith("/freight/bookings");
  }
  if (item.id === "requests") {
    return path.startsWith("/freight/requests");
  }
  if (item.id === "quotations") {
    return path.startsWith("/freight/quotations");
  }
  if (item.id === "trips") {
    return path.startsWith("/transport/trips");
  }
  if (item.id === "vehicles") {
    return path.startsWith("/transport/fleet");
  }
  if (item.id === "drivers") {
    return path.startsWith("/transport/drivers");
  }
  if (item.id === "clearance-jobs") {
    return path === "/customs" || path.startsWith("/customs/");
  }
  if (item.id === "declarations") {
    return path.startsWith("/customs/cdc");
  }
  if (item.id === "document-inbox") {
    return path === "/documents" || (path.startsWith("/documents/") && !path.includes("/reconciliation"));
  }
  if (item.id === "ocr-verification") {
    return path.startsWith("/documents/reconciliation");
  }
  if (item.id === "customers") {
    return path.startsWith("/partners");
  }
  if (item.id === "partners-directory") {
    return path.startsWith("/network/contacts-locations");
  }
  if (item.id === "organizations") {
    return path.startsWith("/organizations");
  }
  if (item.id === "team-permissions") {
    return path.startsWith("/team");
  }
  if (item.id === "audit-logs") {
    return path.startsWith("/audit");
  }
  if (item.id === "material-requests") {
    return path.startsWith("/material-requests");
  }
  if (item.id === "purchase-orders") {
    return path.startsWith("/purchase-orders");
  }
  return path === item.href;
}

export function navigationLocation(path: string): { group: string; label: string } {
  if (itemMatchesPath(dashboardNav, path)) {
    return { group: "Workspace", label: dashboardNav.label };
  }
  if (itemMatchesPath(procurementItems[0], path)) {
    return { group: "Procurement", label: procurementItems[0].label };
  }
  if (itemMatchesPath(procurementItems[1], path)) {
    return { group: "Procurement", label: procurementItems[1].label };
  }

  for (const item of commercialItems) {
    if (itemMatchesPath(item, path)) {
      return { group: "Commercial", label: item.label };
    }
  }

  for (const group of operationsGroups) {
    for (const item of group.items) {
      if (itemMatchesPath(item, path)) {
        return { group: group.label, label: item.label };
      }
    }
  }

  for (const group of businessGroups) {
    for (const item of group.items) {
      if (itemMatchesPath(item, path)) {
        return { group: group.label, label: item.label };
      }
    }
  }

  for (const group of systemGroups) {
    for (const item of group.items) {
      if (itemMatchesPath(item, path)) {
        return { group: group.label, label: item.label };
      }
    }
  }

  return { group: "Workspace", label: "Workspace" };
}
