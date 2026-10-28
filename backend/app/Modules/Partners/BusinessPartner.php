<?php

namespace App\Modules\Partners;

use App\Modules\Locations\Location;
use Database\Factories\BusinessPartnerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusinessPartner extends Model
{
    /** @use HasFactory<BusinessPartnerFactory> */
    use HasFactory;

    protected $guarded = ['id', 'organization_id', 'archived_at'];

    protected function casts(): array
    {
        return ['roles' => 'array', 'archived_at' => 'datetime'];
    }

    protected static function newFactory(): BusinessPartnerFactory
    {
        return BusinessPartnerFactory::new();
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(PartnerContact::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function ensureActive(): void
    {
        abort_if($this->archived_at !== null, 409, 'Restore this partner before making changes.');
    }
}
