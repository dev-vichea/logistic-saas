<?php

namespace App\Modules\Organizations;

use App\Modules\Audit\AuditEvent;
use App\Modules\Customs\CdcMasterList;
use App\Modules\Customs\CustomsDeclaration;
use App\Modules\Documents\DocumentReconciliation;
use App\Modules\Documents\TradeDocument;
use App\Modules\Freight\Booking;
use App\Modules\Freight\FreightRequest;
use App\Modules\Freight\Quotation;
use App\Modules\Freight\Shipment;
use App\Modules\Locations\Location;
use App\Modules\Partners\BusinessPartner;
use App\Modules\Team\Department;
use App\Modules\Team\Invitation;
use App\Modules\Transportation\DispatchTrip;
use App\Modules\Transportation\Driver;
use App\Modules\Transportation\ProofOfDelivery;
use App\Modules\Transportation\Vehicle;
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
        return $this->hasMany(FreightRequest::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function drivers(): HasMany
    {
        return $this->hasMany(Driver::class);
    }

    public function dispatchTrips(): HasMany
    {
        return $this->hasMany(DispatchTrip::class);
    }

    public function proofOfDeliveries(): HasMany
    {
        return $this->hasMany(ProofOfDelivery::class);
    }

    public function tradeDocuments(): HasMany
    {
        return $this->hasMany(TradeDocument::class);
    }

    public function documentReconciliations(): HasMany
    {
        return $this->hasMany(DocumentReconciliation::class);
    }

    public function cdcMasterLists(): HasMany
    {
        return $this->hasMany(CdcMasterList::class);
    }

    public function customsDeclarations(): HasMany
    {
        return $this->hasMany(CustomsDeclaration::class);
    }
}
