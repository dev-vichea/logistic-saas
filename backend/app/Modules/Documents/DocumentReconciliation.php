<?php

namespace App\Modules\Documents;

use App\Models\User;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentReconciliation extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $attributes = [
        'status' => 'balanced',
        'total_invoice_items' => 0,
        'total_packing_items' => 0,
        'matched_items_count' => 0,
        'discrepancy_count' => 0,
        'invoice_total_quantity' => 0,
        'packing_total_quantity' => 0,
    ];

    protected function casts(): array
    {
        return [
            'invoice_total_quantity' => 'decimal:3',
            'packing_total_quantity' => 'decimal:3',
            'invoice_total_gross_weight' => 'decimal:2',
            'packing_total_gross_weight' => 'decimal:2',
            'discrepancies' => 'array',
            'pairs' => 'array',
            'reviewed_at' => 'datetime',
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

    public function invoiceDocument(): BelongsTo
    {
        return $this->belongsTo(TradeDocument::class, 'invoice_document_id');
    }

    public function packingListDocument(): BelongsTo
    {
        return $this->belongsTo(TradeDocument::class, 'packing_list_document_id');
    }

    public function reviewedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
