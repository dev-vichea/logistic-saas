<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BookingFormRequest extends FormRequest
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
            'booking_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'quotation_id' => ['sometimes', 'nullable', 'integer'],
            'customer_id' => [$required, 'integer'],
            'shipper_id' => ['sometimes', 'nullable', 'integer'],
            'consignee_id' => ['sometimes', 'nullable', 'integer'],
            'origin_location_id' => [$required, 'integer'],
            'destination_location_id' => [$required, 'integer'],
            'transport_mode' => [$required, Rule::in(['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal'])],
            'incoterm' => ['sometimes', 'nullable', 'string', 'max:10'],
            'customer_reference' => ['sometimes', 'nullable', 'string', 'max:80'],
            'status' => ['sometimes', Rule::in(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'])],
            'total_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'cargo_items' => ['sometimes', 'array'],
            'cargo_items.*.description' => ['required_with:cargo_items', 'string', 'max:250'],
            'cargo_items.*.package_type' => ['sometimes', 'string', 'max:50'],
            'cargo_items.*.quantity' => ['required_with:cargo_items', 'integer', 'min:1'],
            'cargo_items.*.gross_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'cargo_items.*.volume_cbm' => ['sometimes', 'numeric', 'min:0'],
            'organization_id' => ['prohibited'],
        ];
    }
}
