<?php

namespace App\Modules\Freight;

use App\Modules\Customs\CustomsDeclaration;
use App\Modules\Documents\DocumentReconciliation;
use App\Modules\Documents\TradeDocument;
use App\Modules\Locations\Location;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = [
        'status' => 'draft',
        'customs_status' => 'not_applicable',
        'commercial_status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'etd' => 'datetime',
            'atd' => 'datetime',
            'eta' => 'datetime',
            'ata' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'customer_id');
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

    public function cargoItems(): HasMany
    {
        return $this->hasMany(CargoItem::class);
    }

    public function legs(): HasMany
    {
        return $this->hasMany(ShipmentLeg::class)->orderBy('sequence');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ShipmentParticipant::class);
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(ShipmentMilestone::class)->orderBy('occurred_at', 'desc');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TradeDocument::class);
    }

    public function documentReconciliations(): HasMany
    {
        return $this->hasMany(DocumentReconciliation::class);
    }

    public function customsDeclarations(): HasMany
    {
        return $this->hasMany(CustomsDeclaration::class);
    }
}
