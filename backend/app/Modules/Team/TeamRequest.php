<?php

namespace App\Modules\Team;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'email', 'lowercase', 'max:254'],
            'role' => ['required', Rule::in(['admin', 'manager', 'member', 'viewer'])],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('organization_id', $this->route('organization'))],
        ];
    }
}
