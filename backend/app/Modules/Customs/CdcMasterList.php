<?php

namespace App\Modules\Customs;

use App\Models\User;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CdcMasterList extends Model
{
    protected $table = 'cdc_master_lists';

    protected $guarded = ['id'];

    protected $casts = [
        'effective_year' => 'integer',
        'valid_from' => 'date:Y-m-d',
        'valid_until' => 'date:Y-m-d',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CdcMasterItem::class, 'cdc_master_list_id')->orderBy('item_number');
    }

    public function declarations(): HasMany
    {
        return $this->hasMany(CustomsDeclaration::class, 'cdc_master_list_id');
    }
}
