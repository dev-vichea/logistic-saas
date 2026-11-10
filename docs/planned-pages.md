# Planned workspace pages

ShipFlow’s sidebar mixes working screens with entries marked Planned. This map uses the route and data model as the source of truth for what each page can support.

## How work moves through the workspace

1. **Commercial intake.** A customer request becomes a quotation. An accepted quote can become a booking, and the booking can feed a shipment. Direct bookings are also supported. The shipment holds the cargo, transport legs, participants, and milestones.
2. **Road execution.** A dispatcher attaches road legs to a trip and assigns a vehicle and driver. Dispatch updates the attached legs and emits a departure milestone. Proof of delivery completes the leg and releases the driver and vehicle. The shipment is delivered after all legs are complete.
3. **Documents and clearance.** Staff upload and review trade documents, reconcile discrepancies, and can sync verified line items to shipment cargo. Customs staff link declarations and supporting documents to a shipment, record CDC quota deductions where applicable, and update customs status separately from transport status.
4. **Supporting records.** Partners supply the customer, carrier, broker, contact, and location records used by these workflows. Procurement has its own material request and purchase order screens. Finance, reporting, and external collaboration need their own contracts and permissions.

## Page briefs

### Operations

| Planned page | What the page needs to do | Data and decisions |
| --- | --- | --- |
| Dispatch Board | Show draft, active, and completed runs. Surface missing assignments and link each run to its existing trip actions. | Available at `/transport/dispatch-board`. Each stage paginates its own trips. Existing permissions govern dispatch and proof of delivery. |
| Schedule | Compare planned pickups and deliveries on a weekly fleet timeline. Keep unscheduled trips discoverable. | Available at `/transport/schedule`. Trips appear on vehicle rows in the organization’s timezone, including runs that carry over from an earlier week. |
| Transport Orders | Review a haulage assignment with shipment, leg, stops, assignee, and dispatch state. | Available at `/transport/orders` as a view of shipment legs assigned to run sheets. |
| Tenders | Request a carrier bid, compare responses, and award a leg. | Needs offer and response records, award rules, and a secure way for external carriers to respond. |
| Manifests | Review cargo, package counts, weight, container, and seal references for a run. | Available at `/transport/manifests`. The view lists cargo from the shipments attached to each run sheet. Formal manifest issuance needs versioning and sign-off rules. |
| Maintenance | Review vehicles in the workshop, upcoming service, and open work orders. | Vehicle status supports an in-maintenance filter today. Service intervals, repairs, and release to service need maintenance records. |
| Permits | Track certificates by issuing authority, validity, and linked shipment or declaration. | Needs a permit record and permissions. Customs declarations and document uploads provide references for that future record. |

### Business and administration

| Planned page | What the page needs to do | Data and decisions |
| --- | --- | --- |
| Document Library | Find verified trade documents by type or reference and open the source record. | Reuse the document vault and its verified status filter. Upload and reconciliation live in their existing workflows. |
| Carriers | Find carrier companies and open their contacts, locations, and profile. | Reuse the partner directory with the `carrier` role. |
| Brokers | Find broker companies and open their contacts, locations, and profile. | Reuse the partner directory with the `broker` role. |
| Locations | Find reusable ports, warehouses, yards, and delivery sites across partners. | The partner API lists locations under a single partner. An organization-wide directory needs a scoped, paginated location search with a partner reference. |
| Charges | Review billable and payable charges with source references, currency, and approval state. | Freight quotations and bookings provide source context. Define charge ownership, approval, and currency treatment before building finance screens. |
| Customer Invoices | Turn approved sales charges into an invoice and track its balance. | Needs invoice numbering, issue and void rules, tax handling, and allocation against customer receipts. |
| Vendor Bills | Match a carrier or subcontractor bill to the relevant work and prepare it for payment. | Needs vendor references, duplicate handling, payable approval, and allocations. |
| Payments | Record receipts and disbursements and reconcile them against invoices or bills. | Needs payment records, partial allocations, reversals, and an audit trail. |
| Reports | Compare shipment throughput, on-time delivery, and profitability over a date range. | Define the time window, unit, inclusion rules, and source for each measure. Profitability depends on revenue and cost records. |
| Shared Access | Review who outside the organization can access a record and revoke grants. | Needs explicit cross-organization consent and scoped grants. Partner directory records are private to their owning tenant. |

## Build order

1. **Reuse existing data and screens.** Carriers at `/network/carriers`, Brokers at `/network/brokers`, and Document Library at `/documents/library` share the existing list and detail components.
2. **Extend operational read views.** Dispatch Board, Schedule, Transport Orders, and Manifests use existing run sheets. Cross-partner location search still needs a scoped endpoint.
3. **Design the remaining domain workflows.** Maintenance, permits, tendering, billing, reports, and shared access need their missing data and access rules before the sidebar can expose working pages.

Every enabled page should use the selected organization, handle loading, empty, error, and restricted states, and link to an existing record for actions that already have a home.
