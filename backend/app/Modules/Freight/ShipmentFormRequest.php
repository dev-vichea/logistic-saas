<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShipmentFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('freight.manage');

        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'shipment_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'booking_id' => ['sometimes', 'nullable', 'integer'],
            'customer_id' => [$required, 'integer'],
            'carrier_id' => ['sometimes', 'nullable', 'integer'],
            'origin_location_id' => [$required, 'integer'],
            'destination_location_id' => [$required, 'integer'],
            'transport_mode' => [$required, Rule::in(['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal'])],
            'master_tracking_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'status' => ['sometimes', Rule::in(['draft', 'planned', 'dispatched', 'in_transit', 'arrived_hub', 'out_for_delivery', 'delivered', 'closed', 'cancelled'])],
            'customs_status' => ['sometimes', Rule::in(['not_applicable', 'pending_docs', 'declaration_drafted', 'under_inspection', 'cleared', 'released'])],
            'commercial_status' => ['sometimes', Rule::in(['pending', 'quoted', 'confirmed', 'invoiced', 'paid'])],
            'etd' => ['sometimes', 'nullable', 'date'],
            'atd' => ['sometimes', 'nullable', 'date'],
            'eta' => ['sometimes', 'nullable', 'date'],
            'ata' => ['sometimes', 'nullable', 'date'],
            'special_instructions' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'cargo_items' => ['sometimes', 'array'],
            'cargo_items.*.description' => ['required_with:cargo_items', 'string', 'max:250'],
            'cargo_items.*.commodity' => ['sometimes', 'nullable', 'string', 'max:100'],
            'cargo_items.*.hs_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'cargo_items.*.package_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'cargo_items.*.quantity' => ['required_with:cargo_items', 'integer', 'min:1'],
            'cargo_items.*.container_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'cargo_items.*.seal_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'cargo_items.*.gross_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'cargo_items.*.net_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'cargo_items.*.volume_cbm' => ['sometimes', 'numeric', 'min:0'],
            'legs' => ['sometimes', 'array'],
            'legs.*.sequence' => ['sometimes', 'integer', 'min:1'],
            'legs.*.leg_type' => ['required_with:legs', Rule::in(['pre_carriage', 'main_carriage', 'on_carriage', 'customs_inspection'])],
            'legs.*.transport_mode' => ['required_with:legs', Rule::in(['road', 'ocean', 'air', 'rail'])],
            'legs.*.origin_location_id' => ['required_with:legs', 'integer'],
            'legs.*.destination_location_id' => ['required_with:legs', 'integer'],
            'legs.*.carrier_id' => ['sometimes', 'nullable', 'integer'],
            'legs.*.vessel_or_flight_or_plate' => ['sometimes', 'nullable', 'string', 'max:100'],
            'legs.*.voyage_or_trip_number' => ['sometimes', 'nullable', 'string', 'max:60'],
            'legs.*.scheduled_departure' => ['sometimes', 'nullable', 'date'],
            'legs.*.scheduled_arrival' => ['sometimes', 'nullable', 'date'],
            'legs.*.notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'participants' => ['sometimes', 'array'],
            'participants.*.business_partner_id' => ['required_with:participants', 'integer'],
            'participants.*.role' => ['required_with:participants', Rule::in(['shipper', 'consignee', 'carrier', 'customs_broker', 'forwarder', 'notify_party'])],
            'participants.*.notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            'organization_id' => ['prohibited'],
        ];
    }
}
