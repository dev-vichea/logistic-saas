<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\Request;

class TransportationCatalogController
{
    public function index(Request $request): array
    {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('transport.view');
        $org = $ctx->organization;

        return [
            'data' => [
                'vehicle_types' => [
                    ['value' => 'tractor_head', 'label' => 'Tractor Head / Prime Mover'],
                    ['value' => 'rigid_truck', 'label' => 'Rigid Truck (10T - 15T)'],
                    ['value' => 'container_chassis', 'label' => '20ft/40ft Container Chassis Trailer'],
                    ['value' => 'flatbed_trailer', 'label' => 'Flatbed Semi-Trailer'],
                    ['value' => 'box_truck', 'label' => 'Light Box Truck (3T - 5T)'],
                    ['value' => 'van', 'label' => 'Cargo Delivery Van'],
                    ['value' => 'other', 'label' => 'Other Fleet Asset'],
                ],
                'ownership_types' => [
                    ['value' => 'owned', 'label' => 'Company Owned Fleet'],
                    ['value' => 'leased', 'label' => 'Long-Term Leased'],
                    ['value' => 'subcontracted', 'label' => 'Subcontracted / 3rd-Party Transporter'],
                ],
                'vehicle_statuses' => [
                    ['value' => 'available', 'label' => 'Available (Ready for Dispatch)'],
                    ['value' => 'dispatched', 'label' => 'Dispatched (On Run-Sheet)'],
                    ['value' => 'maintenance', 'label' => 'In Maintenance / Workshop'],
                    ['value' => 'inactive', 'label' => 'Inactive / Decommissioned'],
                ],
                'driver_license_types' => [
                    ['value' => 'light_truck', 'label' => 'Light Commercial (Class B)'],
                    ['value' => 'heavy_truck', 'label' => 'Heavy Truck (Class C)'],
                    ['value' => 'articulated_trailer', 'label' => 'Articulated / Trailer (Class E)'],
                    ['value' => 'hazardous_materials', 'label' => 'Dangerous Goods / Hazmat Certified'],
                ],
                'driver_statuses' => [
                    ['value' => 'available', 'label' => 'Available (On Duty)'],
                    ['value' => 'on_trip', 'label' => 'On Trip (Active Run-Sheet)'],
                    ['value' => 'rest_leave', 'label' => 'Rest / Vacation Leave'],
                    ['value' => 'inactive', 'label' => 'Inactive'],
                ],
                'trip_statuses' => [
                    ['value' => 'draft', 'label' => 'Draft Run-Sheet'],
                    ['value' => 'dispatched', 'label' => 'Dispatched'],
                    ['value' => 'loading', 'label' => 'Loading Cargo at Origin'],
                    ['value' => 'in_transit', 'label' => 'In Transit'],
                    ['value' => 'unloading', 'label' => 'Unloading at Destination'],
                    ['value' => 'completed', 'label' => 'Completed & POD Signed'],
                    ['value' => 'cancelled', 'label' => 'Cancelled'],
                ],
                'vehicles' => $org->vehicles()->where('is_active', true)->select(['id', 'plate_number', 'type', 'make_model', 'max_payload_kg', 'current_status'])->get(),
                'drivers' => $org->drivers()->where('is_active', true)->select(['id', 'full_name', 'phone', 'license_type', 'current_status'])->get(),
                'locations' => $org->locations()->select(['id', 'name', 'type', 'city', 'country_code'])->get(),
                'dispatchable_legs' => $org->shipments()
                    ->whereNotIn('status', ['delivered', 'closed', 'cancelled'])
                    ->with(['legs' => function ($q) {
                        $q->whereIn('status', ['scheduled', 'loading'])
                            ->with(['originLocation:id,name,city', 'destinationLocation:id,name,city']);
                    }])
                    ->get()
                    ->pluck('legs')
                    ->flatten(),
            ],
        ];
    }
}
