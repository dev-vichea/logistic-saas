<?php

namespace App\Modules\Freight;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CargoItem extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'length_cm' => 'decimal:2',
            'width_cm' => 'decimal:2',
            'height_cm' => 'decimal:2',
            'gross_weight_kg' => 'decimal:2',
            'net_weight_kg' => 'decimal:2',
            'volume_cbm' => 'decimal:3',
            'is_dangerous' => 'boolean',
            'is_temperature_controlled' => 'boolean',
            'temp_min_celsius' => 'decimal:2',
            'temp_max_celsius' => 'decimal:2',
        ];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
