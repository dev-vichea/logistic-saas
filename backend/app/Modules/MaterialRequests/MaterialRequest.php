<?php

namespace App\Modules\MaterialRequests;

use App\Models\User;
use App\Modules\Organizations\Organization;
use App\Modules\PurchaseOrders\PurchaseOrder;
use App\Modules\RecordDocuments\RecordDocument;
use Database\Factories\MaterialRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MaterialRequest extends Model
{
    /** @use HasFactory<MaterialRequestFactory> */
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = ['status' => 'draft'];

    protected function casts(): array
    {
        return ['needed_by' => 'date:Y-m-d', 'submitted_at' => 'datetime'];
    }

    protected static function newFactory(): MaterialRequestFactory
    {
        return MaterialRequestFactory::new();
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MaterialRequestItem::class)->orderBy('line_number');
    }

    public function purchaseOrder(): HasOne
    {
        return $this->hasOne(PurchaseOrder::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(RecordDocument::class);
    }
}
