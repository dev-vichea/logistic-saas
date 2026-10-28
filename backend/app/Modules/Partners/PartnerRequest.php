<?php

namespace App\Modules\Partners;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('partners.manage');

        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => mb_strtoupper(trim($this->input('code')))]);
        }
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'filled', 'string', 'max:200'],
            'legal_name' => ['sometimes', 'nullable', 'string', 'max:250'],
            'code' => ['sometimes', 'nullable', 'string', 'max:40', Rule::unique('business_partners')->where('organization_id', $this->route('organization'))->ignore($this->route('partner'))],
            'roles' => [$required, 'filled', 'array', 'min:1', 'max:8'],
            'roles.*' => ['required', 'string', 'distinct', Rule::in(array_keys(config('partners.roles')))],
            'country_code' => [$required, 'filled', Rule::in(array_keys(config('partner_countries')))],
            'registration_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tax_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'email' => ['sometimes', 'nullable', 'email', 'max:254'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'website' => ['sometimes', 'nullable', 'url:http,https', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'organization_id' => ['prohibited'], 'archived_at' => ['prohibited'],
        ];
    }
}
