<?php

namespace App\Modules\Customs;

use Illuminate\Foundation\Http\FormRequest;

class CdcMasterItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => ['nullable', 'string', 'in:machinery,raw_materials'],
            'item_number' => ['nullable', 'integer'],
            'description_original' => ['nullable', 'string'],
            'description_english' => ['required', 'string'],
            'hs_code' => ['nullable', 'string', 'max:30'],
            'model_specification' => ['nullable', 'string', 'max:255'],
            'unit_of_measure' => ['nullable', 'string', 'max:30'],
            'approved_quantity' => ['required', 'numeric', 'min:0.001'],
            'unit_price_usd' => ['nullable', 'numeric', 'min:0'],
            'total_price_usd' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
