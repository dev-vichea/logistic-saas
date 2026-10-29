<?php

namespace App\Modules\Documents;

use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradeDocumentItem extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $attributes = [
        'unit_of_measure' => 'PCS',
        'match_status' => 'unmatched',
        'quantity' => 1,
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:4',
            'total_amount' => 'decimal:2',
            'gross_weight_kg' => 'decimal:2',
            'net_weight_kg' => 'decimal:2',
            'volume_cbm' => 'decimal:3',
            'discrepancy_details' => 'array',
            'raw_metadata' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(TradeDocument::class, 'trade_document_id');
    }
}
