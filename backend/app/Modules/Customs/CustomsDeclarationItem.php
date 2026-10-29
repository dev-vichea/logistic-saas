<?php

namespace App\Modules\Customs;

use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomsDeclarationItem extends Model
{
    protected $table = 'customs_declaration_items';

    protected $guarded = ['id'];

    protected $casts = [
        'item_number' => 'integer',
        'quantity' => 'decimal:3',
        'gross_weight_kg' => 'decimal:3',
        'net_weight_kg' => 'decimal:3',
        'customs_value_usd' => 'decimal:2',
        'duty_rate_percent' => 'decimal:2',
        'is_duty_exempt' => 'boolean',
        'exempt_amount_usd' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function declaration(): BelongsTo
    {
        return $this->belongsTo(CustomsDeclaration::class, 'customs_declaration_id');
    }

    public function cdcMasterItem(): BelongsTo
    {
        return $this->belongsTo(CdcMasterItem::class, 'cdc_master_item_id');
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(CdcQuotaDeduction::class, 'customs_declaration_item_id');
    }
}
