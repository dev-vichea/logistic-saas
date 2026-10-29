<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\Organization;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = [
        'type' => 'rigid_truck',
        'ownership_type' => 'owned',
        'current_status' => 'available',
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'max_payload_kg' => 'decimal:2',
            'volume_capacity_cbm' => 'decimal:3',
            'is_active' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function carrierPartner(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'carrier_partner_id');
    }

    public function trips(): HasMany
    {
        return $this->hasMany(DispatchTrip::class, 'vehicle_id');
    }
}
