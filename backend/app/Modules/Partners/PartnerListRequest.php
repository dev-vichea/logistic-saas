<?php

namespace App\Modules\Partners;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PartnerListRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('partners.view');

        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(['active', 'archived', 'all'])],
            'role' => ['nullable', Rule::in(array_keys(config('partners.roles')))],
            'country_code' => ['nullable', Rule::in(array_keys(config('partner_countries')))],
            'sort' => ['sometimes', Rule::in(['name', 'code', 'country_code', 'created_at', 'updated_at'])],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
        ];
    }
}
