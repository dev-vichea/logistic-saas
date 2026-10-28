<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuotationFormRequest extends FormRequest
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
            'quotation_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'freight_request_id' => ['sometimes', 'nullable', 'integer'],
            'customer_id' => [$required, 'integer'],
            'shipper_id' => ['sometimes', 'nullable', 'integer'],
            'consignee_id' => ['sometimes', 'nullable', 'integer'],
            'origin_location_id' => [$required, 'integer'],
            'destination_location_id' => [$required, 'integer'],
            'transport_mode' => [$required, Rule::in(['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal'])],
            'incoterm' => ['sometimes', 'nullable', 'string', 'max:10'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'status' => ['sometimes', Rule::in(['draft', 'sent', 'accepted', 'rejected', 'expired'])],
            'valid_until' => ['sometimes', 'nullable', 'date'],
            'terms_and_conditions' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'line_items' => ['sometimes', 'array'],
            'line_items.*.description' => ['required_with:line_items', 'string', 'max:250'],
            'line_items.*.charge_type' => ['sometimes', 'string', 'max:50'],
            'line_items.*.quantity' => ['required_with:line_items', 'numeric', 'min:0.01'],
            'line_items.*.unit_price' => ['required_with:line_items', 'numeric', 'min:0'],
            'line_items.*.currency' => ['sometimes', 'string', 'size:3'],
            'organization_id' => ['prohibited'],
        ];
    }
}
