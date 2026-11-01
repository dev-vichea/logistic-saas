<?php

namespace App\Modules\RecordDocuments;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class RecordDocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        $permission = $this->route('materialRequest') !== null ? 'material_requests.manage' : 'purchase_orders.manage';
        OrganizationContext::from($this)->authorize($permission);

        return true;
    }

    public function rules(): array
    {
        return ['file' => ['required', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:10240']];
    }
}
