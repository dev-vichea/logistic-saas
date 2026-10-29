<?php

namespace App\Modules\Customs;

use Illuminate\Foundation\Http\FormRequest;

class CustomsStatusTransitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:draft,cdc_deducted,lodged,under_inspection,cleared,released,rejected'],
            'inspection_lane' => ['nullable', 'string', 'in:green,blue,yellow,red'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
