<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class CargoItemFormRequest extends FormRequest
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
            'description' => [$required, 'string', 'max:250'],
            'commodity' => ['sometimes', 'nullable', 'string', 'max:100'],
            'hs_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'package_type' => ['sometimes', 'string', 'max:50'],
            'quantity' => [$required, 'integer', 'min:1'],
            'container_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'seal_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'length_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'width_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'height_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'gross_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'net_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'volume_cbm' => ['sometimes', 'numeric', 'min:0'],
            'is_dangerous' => ['sometimes', 'boolean'],
            'un_number' => ['sometimes', 'nullable', 'string', 'max:10'],
            'is_temperature_controlled' => ['sometimes', 'boolean'],
            'temp_min_celsius' => ['sometimes', 'nullable', 'numeric'],
            'temp_max_celsius' => ['sometimes', 'nullable', 'numeric'],
            'organization_id' => ['prohibited'],
        ];
    }
}
