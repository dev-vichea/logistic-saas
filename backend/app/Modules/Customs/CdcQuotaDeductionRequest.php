<?php

namespace App\Modules\Customs;

use Illuminate\Foundation\Http\FormRequest;

class CdcQuotaDeductionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'deductions' => ['required', 'array', 'min:1'],
            'deductions.*.declaration_item_id' => ['required', 'integer'],
            'deductions.*.cdc_master_item_id' => ['required', 'integer'],
            'deductions.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'deductions.*.notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
