<?php

namespace App\Modules\Documents;

use Illuminate\Foundation\Http\FormRequest;

class DocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type' => ['nullable', 'string', 'in:commercial_invoice,packing_list,bill_of_lading,cdc_master_list,delivery_order,customs_declaration,other'],
            'document_number' => ['nullable', 'string', 'max:80'],
            'shipment_id' => ['nullable', 'integer'],
            'language' => ['nullable', 'string', 'max:30'],
            'file_name' => ['nullable', 'string', 'max:255'],
            'file' => ['nullable', 'file', 'max:20480'], // max 20MB
            'raw_content' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'structured_input' => ['nullable', 'array'],
        ];
    }
}
