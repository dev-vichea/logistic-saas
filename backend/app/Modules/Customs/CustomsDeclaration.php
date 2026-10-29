<?php

namespace App\Modules\Customs;

use App\Models\User;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomsDeclaration extends Model
{
    protected $table = 'customs_declarations';

    protected $guarded = ['id'];

    protected $casts = [
        'declaration_date' => 'date:Y-m-d',
        'total_packages' => 'integer',
        'total_gross_weight_kg' => 'decimal:3',
        'total_net_weight_kg' => 'decimal:3',
        'customs_value_usd' => 'decimal:2',
        'duty_exemption_amount_usd' => 'decimal:2',
        'payable_duty_usd' => 'decimal:2',
        'payable_vat_usd' => 'decimal:2',
        'cleared_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function cdcMasterList(): BelongsTo
    {
        return $this->belongsTo(CdcMasterList::class, 'cdc_master_list_id');
    }

    public function declarantPartner(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'declarant_partner_id');
    }

    public function consigneePartner(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'consignee_partner_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CustomsDeclarationItem::class, 'customs_declaration_id')->orderBy('item_number');
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(CdcQuotaDeduction::class, 'customs_declaration_id')->orderBy('id', 'desc');
    }
}
