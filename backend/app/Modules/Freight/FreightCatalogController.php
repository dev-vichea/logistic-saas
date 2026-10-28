<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\Request;

class FreightCatalogController
{
    public function index(Request $request): array
    {
        OrganizationContext::from($request)->authorize('freight.view');

        return [
            'data' => [
                'transport_modes' => [
                    ['value' => 'road', 'label' => 'Road Freight (FTL / LTL)'],
                    ['value' => 'ocean_fcl', 'label' => 'Ocean Freight (FCL)'],
                    ['value' => 'ocean_lcl', 'label' => 'Ocean Freight (LCL)'],
                    ['value' => 'air', 'label' => 'Air Cargo'],
                    ['value' => 'multimodal', 'label' => 'Multimodal Transportation'],
                ],
                'incoterms' => ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'],
                'package_types' => [
                    'cartons', 'pallets', 'crates', 'containers', 'drums', 'bags', 'rolls', 'loose', 'boxes', 'bundles',
                ],
                'charge_types' => [
                    ['value' => 'freight', 'label' => 'Main Freight Carriage'],
                    ['value' => 'origin_handling', 'label' => 'Origin Port / Terminal Handling (THC)'],
                    ['value' => 'destination_handling', 'label' => 'Destination Terminal Handling (DTHC)'],
                    ['value' => 'customs', 'label' => 'Customs Clearance & Brokerage'],
                    ['value' => 'documentation', 'label' => 'Documentation & Bill of Lading Fee'],
                    ['value' => 'storage', 'label' => 'Warehousing & Storage'],
                    ['value' => 'fuel_surcharge', 'label' => 'Fuel Surcharge (BAF / FSC)'],
                    ['value' => 'other', 'label' => 'Other Operational Surcharge'],
                ],
                'leg_types' => [
                    ['value' => 'pre_carriage', 'label' => 'Pre-Carriage (Pickup / Haulage)'],
                    ['value' => 'main_carriage', 'label' => 'Main Carriage (Ocean / Air / Line-haul)'],
                    ['value' => 'on_carriage', 'label' => 'On-Carriage (Final Delivery)'],
                    ['value' => 'customs_inspection', 'label' => 'Customs Inspection / Border Crossing'],
                ],
                'operational_statuses' => [
                    ['value' => 'draft', 'label' => 'Draft Plan'],
                    ['value' => 'planned', 'label' => 'Planned & Booked'],
                    ['value' => 'dispatched', 'label' => 'Dispatched'],
                    ['value' => 'in_transit', 'label' => 'In Transit'],
                    ['value' => 'arrived_hub', 'label' => 'Arrived at Transit Hub / Port'],
                    ['value' => 'out_for_delivery', 'label' => 'Out for Delivery'],
                    ['value' => 'delivered', 'label' => 'Delivered (POD Signed)'],
                    ['value' => 'closed', 'label' => 'Closed'],
                    ['value' => 'cancelled', 'label' => 'Cancelled'],
                ],
                'customs_statuses' => [
                    ['value' => 'not_applicable', 'label' => 'Not Applicable (Domestic)'],
                    ['value' => 'pending_docs', 'label' => 'Pending Customs Documents'],
                    ['value' => 'declaration_drafted', 'label' => 'ASYCUDA Declaration Drafted'],
                    ['value' => 'under_inspection', 'label' => 'Physical / Document Inspection'],
                    ['value' => 'cleared', 'label' => 'Customs Cleared'],
                    ['value' => 'released', 'label' => 'Port / Gate Released'],
                ],
                'milestone_presets' => [
                    ['code' => 'BOOKING_CONFIRMED', 'title' => 'Booking Confirmed with Carrier'],
                    ['code' => 'CARGO_RECEIVED', 'title' => 'Cargo Received at Origin Warehouse'],
                    ['code' => 'GATE_IN_ORIGIN', 'title' => 'Gate-in at Origin Terminal'],
                    ['code' => 'CUSTOMS_SUBMITTED', 'title' => 'Customs Declaration Lodged'],
                    ['code' => 'CUSTOMS_CLEARED', 'title' => 'Customs Duty Paid & Cleared'],
                    ['code' => 'DEPARTED', 'title' => 'Vessel / Flight / Truck Departed'],
                    ['code' => 'BORDER_ARRIVED', 'title' => 'Arrived at International Border'],
                    ['code' => 'BORDER_CROSSING_CLEARED', 'title' => 'Cross-Border Clearance Completed'],
                    ['code' => 'ARRIVED_DESTINATION', 'title' => 'Arrived at Destination Port / Terminal'],
                    ['code' => 'OUT_FOR_DELIVERY', 'title' => 'Loaded for Final Delivery'],
                    ['code' => 'DELIVERED', 'title' => 'Delivered & Consignee Signed POD'],
                    ['code' => 'EXCEPTION', 'title' => 'Operational Delay / Exception'],
                ],
            ],
        ];
    }
}
