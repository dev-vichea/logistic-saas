<?php

namespace App\Modules\Customs;

use App\Models\User;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CdcQuotaDeduction extends Model
{
    protected $table = 'cdc_quota_deductions';

    protected $guarded = ['id'];

    protected $casts = [
        'deducted_quantity' => 'decimal:3',
        'balance_before' => 'decimal:3',
        'balance_after' => 'decimal:3',
        'deducted_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function cdcMasterItem(): BelongsTo
    {
        return $this->belongsTo(CdcMasterItem::class, 'cdc_master_item_id');
    }

    public function declaration(): BelongsTo
    {
        return $this->belongsTo(CustomsDeclaration::class, 'customs_declaration_id');
    }

    public function declarationItem(): BelongsTo
    {
        return $this->belongsTo(CustomsDeclarationItem::class, 'customs_declaration_item_id');
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
