<?php

namespace App\Modules\Transportation;

use App\Modules\Freight\ShipmentLeg;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchTripLeg extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function dispatchTrip(): BelongsTo
    {
        return $this->belongsTo(DispatchTrip::class, 'dispatch_trip_id');
    }

    public function shipmentLeg(): BelongsTo
    {
        return $this->belongsTo(ShipmentLeg::class, 'shipment_leg_id');
    }
}
