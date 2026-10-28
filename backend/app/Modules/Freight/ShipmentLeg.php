<?php

namespace App\Modules\Freight;

use App\Modules\Locations\Location;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentLeg extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'scheduled_departure' => 'datetime',
            'actual_departure' => 'datetime',
            'scheduled_arrival' => 'datetime',
            'actual_arrival' => 'datetime',
        ];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function carrier(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'carrier_id');
    }

    public function originLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'origin_location_id');
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'destination_location_id');
    }
}
