<?php

namespace App\Modules\Team;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('departments')->where('organization_id', $this->route('organization'))->ignore($this->route('department'))],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
