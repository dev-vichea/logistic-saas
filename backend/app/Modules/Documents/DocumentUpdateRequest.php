<?php

namespace App\Modules\Documents;

use Illuminate\Foundation\Http\FormRequest;

class DocumentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_number' => ['nullable', 'string', 'max:80'],
            'shipment_id' => ['nullable', 'integer'],
            'document_type' => ['nullable', 'string', 'in:commercial_invoice,packing_list,bill_of_lading,cdc_master_list,delivery_order,customs_declaration,other'],
            'status' => ['nullable', 'string', 'in:uploaded,parsing,parsed,reconciled,flagged,verified,error'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
