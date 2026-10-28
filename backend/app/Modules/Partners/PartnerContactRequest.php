<?php

namespace App\Modules\Partners;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class PartnerContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('partners.manage');

        return true;
    }

    public function rules(): array
    {
        return ['name' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'filled', 'string', 'max:160'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:100'],
            'email' => ['sometimes', 'nullable', 'email', 'max:254'], 'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'], 'is_primary' => ['sometimes', 'boolean'],
            'organization_id' => ['prohibited'], 'business_partner_id' => ['prohibited']];
    }
}
