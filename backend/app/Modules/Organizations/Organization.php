<?php

namespace App\Modules\Organizations;

use App\Modules\Audit\AuditEvent;
use App\Modules\Locations\Location;
use App\Modules\Partners\BusinessPartner;
use App\Modules\Team\Department;
use App\Modules\Team\Invitation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['activities' => 'array'];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function audits(): HasMany
    {
        return $this->hasMany(AuditEvent::class);
    }

    public function partners(): HasMany
    {
        return $this->hasMany(BusinessPartner::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function freightRequests(): HasMany
    {
        return $this->hasMany(\App\Modules\Freight\FreightRequest::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(\App\Modules\Freight\Quotation::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(\App\Modules\Freight\Booking::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(\App\Modules\Freight\Shipment::class);
    }
}
