<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LegFormRequest extends FormRequest
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
            'sequence' => ['sometimes', 'integer', 'min:1'],
            'leg_type' => [$required, Rule::in(['pre_carriage', 'main_carriage', 'on_carriage', 'customs_inspection'])],
            'transport_mode' => [$required, Rule::in(['road', 'ocean', 'air', 'rail'])],
            'carrier_id' => ['sometimes', 'nullable', 'integer'],
            'origin_location_id' => [$required, 'integer'],
            'destination_location_id' => [$required, 'integer'],
            'vessel_or_flight_or_plate' => ['sometimes', 'nullable', 'string', 'max:100'],
            'voyage_or_trip_number' => ['sometimes', 'nullable', 'string', 'max:60'],
            'scheduled_departure' => ['sometimes', 'nullable', 'date'],
            'actual_departure' => ['sometimes', 'nullable', 'date'],
            'scheduled_arrival' => ['sometimes', 'nullable', 'date'],
            'actual_arrival' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', Rule::in(['scheduled', 'loading', 'in_transit', 'arrived', 'completed', 'exception'])],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'organization_id' => ['prohibited'],
        ];
    }
}
