<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class ProofOfDeliveryFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('transport.manage');

        return true;
    }

    public function rules(): array
    {
        return [
            'shipment_id' => ['required', 'integer'],
            'recipient_name' => ['required', 'string', 'max:160'],
            'recipient_phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'delivered_at' => ['sometimes', 'nullable', 'date'],
            'signature_svg' => ['sometimes', 'nullable', 'string'],
            'photo_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'received_packages' => ['required', 'integer', 'min:0'],
            'damaged_packages' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'discrepancy_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'signatory_remarks' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'organization_id' => ['prohibited'],
        ];
    }
}
