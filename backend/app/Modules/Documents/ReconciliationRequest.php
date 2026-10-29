<?php

namespace App\Modules\Documents;

use Illuminate\Foundation\Http\FormRequest;

class ReconciliationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'invoice_document_id' => ['required', 'integer'],
            'packing_list_document_id' => ['required', 'integer'],
            'shipment_id' => ['nullable', 'integer'],
        ];
    }
}
