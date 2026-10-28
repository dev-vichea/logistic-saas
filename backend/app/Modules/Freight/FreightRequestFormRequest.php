<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FreightRequestFormRequest extends FormRequest
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
            'request_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'customer_id' => [$required, 'integer'],
            'shipper_id' => ['sometimes', 'nullable', 'integer'],
            'consignee_id' => ['sometimes', 'nullable', 'integer'],
            'origin_location_id' => [$required, 'integer'],
            'destination_location_id' => [$required, 'integer'],
            'transport_mode' => [$required, Rule::in(['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal'])],
            'incoterm' => ['sometimes', 'nullable', 'string', 'max:10'],
            'status' => ['sometimes', Rule::in(['draft', 'submitted', 'reviewing', 'quoted', 'cancelled'])],
            'cargo_description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'package_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'total_pieces' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'total_weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'total_volume_cbm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_dangerous' => ['sometimes', 'boolean'],
            'is_temperature_controlled' => ['sometimes', 'boolean'],
            'target_readiness_date' => ['sometimes', 'nullable', 'date'],
            'target_delivery_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'organization_id' => ['prohibited'],
        ];
    }
}
