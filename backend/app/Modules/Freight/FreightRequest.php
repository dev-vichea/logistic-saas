<?php

namespace App\Modules\Freight;

use App\Modules\Locations\Location;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FreightRequest extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = [
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'is_dangerous' => 'boolean',
            'is_temperature_controlled' => 'boolean',
            'total_pieces' => 'integer',
            'total_weight_kg' => 'decimal:2',
            'total_volume_cbm' => 'decimal:3',
            'target_readiness_date' => 'date',
            'target_delivery_date' => 'date',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'customer_id');
    }

    public function shipper(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'shipper_id');
    }

    public function consignee(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'consignee_id');
    }

    public function originLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'origin_location_id');
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'destination_location_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }
}
