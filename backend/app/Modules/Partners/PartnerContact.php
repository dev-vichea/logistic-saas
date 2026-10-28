<?php

namespace App\Modules\Partners;

use Illuminate\Database\Eloquent\Model;

class PartnerContact extends Model
{
    protected $guarded = ['id', 'organization_id', 'business_partner_id'];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean'];
    }
}
