<?php

namespace App\Modules\MaterialRequests;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class MaterialRequestFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('material_requests.manage');

        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'needed_by' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id' => ['sometimes', 'integer', 'distinct'],
            'items.*.description' => ['required', 'string', 'max:250'],
            'items.*.specification' => ['nullable', 'string', 'max:250'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'decimal:0,3'],
            'items.*.unit' => ['required', 'string', 'max:20'],
            'organization_id' => ['prohibited'],
            'request_number' => ['prohibited'],
            'status' => ['prohibited'],
            'submitted_at' => ['prohibited'],
        ];
    }
}
