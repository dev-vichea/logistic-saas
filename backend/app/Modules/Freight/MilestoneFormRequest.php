<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class MilestoneFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('freight.manage');

        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'location_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'location_id' => ['sometimes', 'nullable', 'integer'],
            'shipment_leg_id' => ['sometimes', 'nullable', 'integer'],
            'occurred_at' => ['sometimes', 'date'],
            'is_exception' => ['sometimes', 'boolean'],
            'organization_id' => ['prohibited'],
        ];
    }
}
