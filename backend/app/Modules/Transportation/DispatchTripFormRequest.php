<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DispatchTripFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('transport.manage');

        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'trip_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'carrier_partner_id' => ['sometimes', 'nullable', 'integer'],
            'vehicle_id' => ['sometimes', 'nullable', 'integer'],
            'trailer_vehicle_id' => ['sometimes', 'nullable', 'integer'],
            'driver_id' => ['sometimes', 'nullable', 'integer'],
            'secondary_driver_id' => ['sometimes', 'nullable', 'integer'],
            'origin_location_id' => [$required, 'integer'],
            'destination_location_id' => [$required, 'integer'],
            'status' => ['sometimes', Rule::in(['draft', 'dispatched', 'loading', 'in_transit', 'unloading', 'completed', 'cancelled'])],
            'scheduled_start_time' => ['sometimes', 'nullable', 'date'],
            'actual_start_time' => ['sometimes', 'nullable', 'date'],
            'scheduled_end_time' => ['sometimes', 'nullable', 'date'],
            'actual_end_time' => ['sometimes', 'nullable', 'date'],
            'odometer_start_km' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'odometer_end_km' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'container_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'seal_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'shipment_leg_ids' => ['sometimes', 'array'],
            'shipment_leg_ids.*' => ['integer'],
            'organization_id' => ['prohibited'],
        ];
    }
}
