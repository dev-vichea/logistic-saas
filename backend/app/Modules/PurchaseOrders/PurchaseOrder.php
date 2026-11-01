<?php

namespace App\Modules\PurchaseOrders;

use App\Models\User;
use App\Modules\MaterialRequests\MaterialRequest;
use App\Modules\Partners\BusinessPartner;
use App\Modules\RecordDocuments\RecordDocument;
use Database\Factories\PurchaseOrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    /** @use HasFactory<PurchaseOrderFactory> */
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = ['status' => 'draft'];

    protected function casts(): array
    {
        return ['expected_delivery_date' => 'date:Y-m-d', 'issued_at' => 'datetime'];
    }

    protected static function newFactory(): PurchaseOrderFactory
    {
        return PurchaseOrderFactory::new();
    }

    public function materialRequest(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'supplier_partner_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class)->orderBy('line_number');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(RecordDocument::class);
    }
}
