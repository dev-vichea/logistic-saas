<?php

namespace App\Modules\PurchaseOrders;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;

class PurchaseOrderFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        OrganizationContext::from($this)->authorize('purchase_orders.manage');

        return true;
    }

    public function rules(): array
    {
        return [
            'material_request_id' => ['required', 'integer'],
            'supplier_partner_id' => ['required', 'integer'],
            'expected_delivery_date' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.material_request_item_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'decimal:0,3'],
            'items.*.unit_price' => ['required', 'numeric', 'gte:0', 'decimal:0,2'],
            'organization_id' => ['prohibited'],
            'po_number' => ['prohibited'],
            'status' => ['prohibited'],
            'currency' => ['prohibited'],
            'supplier_name' => ['prohibited'],
            'issued_at' => ['prohibited'],
        ];
    }
}
