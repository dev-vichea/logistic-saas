<?php

namespace App\Modules\Customs;

use Illuminate\Foundation\Http\FormRequest;

class CdcMasterListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'qip_number' => ['required', 'string', 'max:80'],
            'company_name' => ['required', 'string', 'max:255'],
            'tin_number' => ['nullable', 'string', 'max:80'],
            'approval_reference' => ['required', 'string', 'max:100'],
            'effective_year' => ['nullable', 'integer', 'min:2020', 'max:2050'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'status' => ['nullable', 'string', 'in:active,expired,suspended'],
            'notes' => ['nullable', 'string'],
            'items' => ['nullable', 'array'],
            'items.*.category' => ['nullable', 'string', 'in:machinery,raw_materials'],
            'items.*.item_number' => ['nullable', 'integer'],
            'items.*.description_original' => ['nullable', 'string'],
            'items.*.description_english' => ['required_with:items', 'string'],
            'items.*.hs_code' => ['nullable', 'string', 'max:30'],
            'items.*.model_specification' => ['nullable', 'string', 'max:255'],
            'items.*.unit_of_measure' => ['nullable', 'string', 'max:30'],
            'items.*.approved_quantity' => ['required_with:items', 'numeric', 'min:0.001'],
            'items.*.unit_price_usd' => ['nullable', 'numeric', 'min:0'],
            'items.*.total_price_usd' => ['nullable', 'numeric', 'min:0'],
            'items.*.remarks' => ['nullable', 'string'],
        ];
    }
}
