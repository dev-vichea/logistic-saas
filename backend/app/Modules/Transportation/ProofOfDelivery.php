<?php

namespace App\Modules\Transportation;

use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProofOfDelivery extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'delivered_at' => 'datetime',
            'received_packages' => 'integer',
            'damaged_packages' => 'integer',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function dispatchTrip(): BelongsTo
    {
        return $this->belongsTo(DispatchTrip::class, 'dispatch_trip_id');
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }
}
