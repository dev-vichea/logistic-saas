<?php

namespace App\Modules\Locations;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $guarded = ['id', 'organization_id', 'business_partner_id'];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean', 'latitude' => 'float', 'longitude' => 'float'];
    }
}
