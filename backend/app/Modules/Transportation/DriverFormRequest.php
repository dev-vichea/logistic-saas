<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DriverFormRequest extends FormRequest
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
            'full_name' => [$required, 'string', 'max:160'],
            'phone' => [$required, 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:254'],
            'license_number' => [$required, 'string', 'max:60'],
            'license_type' => ['sometimes', Rule::in(['light_truck', 'heavy_truck', 'articulated_trailer', 'hazardous_materials'])],
            'license_expires_at' => ['sometimes', 'nullable', 'date'],
            'carrier_partner_id' => ['sometimes', 'nullable', 'integer'],
            'current_status' => ['sometimes', Rule::in(['available', 'on_trip', 'rest_leave', 'inactive'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'organization_id' => ['prohibited'],
        ];
    }
}
