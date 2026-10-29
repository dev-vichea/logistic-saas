<?php

namespace App\Modules\Documents;

use App\Models\User;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TradeDocument extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $attributes = [
        'document_type' => 'commercial_invoice',
        'status' => 'uploaded',
        'language' => 'zh-CN,en',
        'file_size_bytes' => 0,
    ];

    protected function casts(): array
    {
        return [
            'confidence_score' => 'decimal:2',
            'extracted_metadata' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(TradeDocumentItem::class)->orderBy('line_number');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }
}
