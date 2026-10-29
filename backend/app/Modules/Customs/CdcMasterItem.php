<?php

namespace App\Modules\Customs;

use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CdcMasterItem extends Model
{
    protected $table = 'cdc_master_items';

    protected $guarded = ['id'];

    protected $casts = [
        'item_number' => 'integer',
        'approved_quantity' => 'decimal:3',
        'consumed_quantity' => 'decimal:3',
        'remaining_quantity' => 'decimal:3',
        'unit_price_usd' => 'decimal:2',
        'total_price_usd' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function masterList(): BelongsTo
    {
        return $this->belongsTo(CdcMasterList::class, 'cdc_master_list_id');
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(CdcQuotaDeduction::class, 'cdc_master_item_id')->orderBy('id', 'desc');
    }
}
