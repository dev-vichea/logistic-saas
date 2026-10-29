<?php

namespace App\Modules\Documents;

use Illuminate\Foundation\Http\FormRequest;

class PushToCargoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipment_id' => ['required', 'integer'],
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['integer'],
        ];
    }
}
