<?php

namespace App\Modules\Team;

use Illuminate\Database\Eloquent\Model;

class Invitation extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }
}
