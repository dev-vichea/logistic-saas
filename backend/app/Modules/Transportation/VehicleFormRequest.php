<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VehicleFormRequest extends FormRequest
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
            'plate_number' => [$required, 'string', 'max:40'],
            'type' => [$required, Rule::in(['tractor_head', 'rigid_truck', 'container_chassis', 'flatbed_trailer', 'box_truck', 'van', 'other'])],
            'ownership_type' => ['sometimes', Rule::in(['owned', 'leased', 'subcontracted'])],
            'carrier_partner_id' => ['sometimes', 'nullable', 'integer'],
            'make_model' => [$required, 'string', 'max:120'],
            'year' => ['sometimes', 'nullable', 'integer', 'min:1970', 'max:2050'],
            'max_payload_kg' => [$required, 'numeric', 'min:0'],
            'volume_capacity_cbm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'current_status' => ['sometimes', Rule::in(['available', 'dispatched', 'maintenance', 'inactive'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'organization_id' => ['prohibited'],
        ];
    }
}
