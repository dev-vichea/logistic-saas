<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\Organization;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentParticipant extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(BusinessPartner::class, 'business_partner_id');
    }

    public function connectedOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'connected_organization_id');
    }
}
