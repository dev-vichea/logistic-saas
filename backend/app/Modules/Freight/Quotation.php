<?php

namespace App\Modules\Freight;

use App\Modules\Locations\Location;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'organization_id'];

    protected $attributes = [
        'status' => 'draft',
        'revision' => 0,
    ];

    protected function casts(): array
    {
        return [
            'revision' => 'integer',
            'subtotal_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'valid_until' => 'date',
        ];
    }

    public function freightRequest(): BelongsTo
    {
        return $this->belongsTo(FreightRequest::class, 'freight_request_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'customer_id');
    }

    public function shipper(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'shipper_id');
    }

    public function consignee(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'consignee_id');
    }

    public function originLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'origin_location_id');
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'destination_location_id');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(QuotationLineItem::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
