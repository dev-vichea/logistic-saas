<?php

namespace App\Modules\Organizations;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'registration_number' => ['nullable', 'string', 'max:80'],
            'tax_number' => ['nullable', 'string', 'max:80'],
            'email' => ['nullable', 'email', 'max:254'],
            'phone' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'url:http,https', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'country_code' => ['required', Rule::in(array_keys(config('platform.countries')))],
            'timezone' => ['required', 'timezone:all'],
            'currency' => ['required', Rule::in(config('platform.currencies'))],
            'activities' => ['required', 'array', 'min:1', 'max:8'],
            'activities.*' => ['required', 'distinct', Rule::in(array_keys(config('platform.activities')))],
        ];
    }
}
