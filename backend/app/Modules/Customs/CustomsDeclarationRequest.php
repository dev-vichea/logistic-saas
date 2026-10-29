<?php

namespace App\Modules\Customs;

use Illuminate\Foundation\Http\FormRequest;

class CustomsDeclarationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'declaration_number' => ['required', 'string', 'max:80'],
            'shipment_id' => ['nullable', 'integer'],
            'cdc_master_list_id' => ['nullable', 'integer'],
            'declaration_date' => ['nullable', 'date'],
            'declaration_type' => ['nullable', 'string', 'in:import,export,transit'],
            'customs_office_code' => ['nullable', 'string', 'max:30'],
            'regime_code' => ['nullable', 'string', 'max:30'],
            'inspection_lane' => ['nullable', 'string', 'in:green,blue,yellow,red'],
            'declarant_partner_id' => ['nullable', 'integer'],
            'consignee_partner_id' => ['nullable', 'integer'],
            'invoice_number' => ['nullable', 'string', 'max:80'],
            'bill_of_lading_number' => ['nullable', 'string', 'max:80'],
            'total_packages' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['nullable', 'array'],
            'items.*.item_number' => ['nullable', 'integer'],
            'items.*.cdc_master_item_id' => ['nullable', 'integer'],
            'items.*.hs_code' => ['required_with:items', 'string', 'max:30'],
            'items.*.description' => ['required_with:items', 'string'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.001'],
            'items.*.unit_of_measure' => ['nullable', 'string', 'max:30'],
            'items.*.gross_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'items.*.net_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'items.*.customs_value_usd' => ['nullable', 'numeric', 'min:0'],
            'items.*.duty_rate_percent' => ['nullable', 'numeric', 'min:0'],
            'items.*.is_duty_exempt' => ['nullable', 'boolean'],
            'items.*.notes' => ['nullable', 'string'],
        ];
    }
}
