<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\Organization;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = [
        'license_type' => 'heavy_truck',
        'current_status' => 'available',
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'license_expires_at' => 'date',
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
        return $this->hasMany(DispatchTrip::class, 'driver_id');
    }
}
