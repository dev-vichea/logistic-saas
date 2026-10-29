<?php

namespace App\Modules\Transportation;

use App\Modules\Locations\Location;
use App\Modules\Organizations\Organization;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DispatchTrip extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = [
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start_time' => 'datetime',
            'actual_start_time' => 'datetime',
            'scheduled_end_time' => 'datetime',
            'actual_end_time' => 'datetime',
            'odometer_start_km' => 'decimal:1',
            'odometer_end_km' => 'decimal:1',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function trailerVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'trailer_vehicle_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function secondaryDriver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'secondary_driver_id');
    }

    public function carrierPartner(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'carrier_partner_id');
    }

    public function originLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'origin_location_id');
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'destination_location_id');
    }

    public function tripLegs(): HasMany
    {
        return $this->hasMany(DispatchTripLeg::class, 'dispatch_trip_id')->orderBy('sequence');
    }

    public function proofOfDeliveries(): HasMany
    {
        return $this->hasMany(ProofOfDelivery::class, 'dispatch_trip_id');
    }
}
