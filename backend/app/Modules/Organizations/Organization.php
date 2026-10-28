<?php

namespace App\Modules\Organizations;

use App\Modules\Audit\AuditEvent;
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
}
