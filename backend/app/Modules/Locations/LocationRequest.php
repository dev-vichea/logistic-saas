<?php

namespace App\Modules\Locations;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('partners.manage');

        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return ['name' => [$required, 'filled', 'string', 'max:160'],
            'type' => [$required, 'filled', Rule::in(array_keys(config('partners.location_types')))],
            'address_line_1' => [$required, 'filled', 'string', 'max:250'],
            'address_line_2' => ['sometimes', 'nullable', 'string', 'max:250'],
            'city' => [$required, 'filled', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:100'], 'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'country_code' => [$required, 'filled', Rule::in(array_keys(config('partner_countries')))],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'], 'is_primary' => ['sometimes', 'boolean'],
            'organization_id' => ['prohibited'], 'business_partner_id' => ['prohibited']];
    }
}
