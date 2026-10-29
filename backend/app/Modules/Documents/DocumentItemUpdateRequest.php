<?php

namespace App\Modules\Documents;

use Illuminate\Foundation\Http\FormRequest;

class DocumentItemUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_code' => ['nullable', 'string', 'max:80'],
            'hs_code' => ['nullable', 'string', 'max:30'],
            'description_original' => ['nullable', 'string'],
            'description_english' => ['required', 'string', 'max:500'],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'unit_of_measure' => ['required', 'string', 'max:30'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'package_count' => ['nullable', 'integer', 'min:0'],
            'package_type' => ['nullable', 'string', 'max:50'],
            'gross_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'net_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'volume_cbm' => ['nullable', 'numeric', 'min:0'],
            'match_status' => ['nullable', 'string', 'in:unmatched,matched,discrepancy,manual_override,confirmed'],
        ];
    }
}
