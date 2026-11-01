<?php

namespace App\Modules\RecordDocuments;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecordDocument extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['file_path'];

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
