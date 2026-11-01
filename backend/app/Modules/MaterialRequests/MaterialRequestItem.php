<?php

namespace App\Modules\MaterialRequests;

use Database\Factories\MaterialRequestItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialRequestItem extends Model
{
    /** @use HasFactory<MaterialRequestItemFactory> */
    use HasFactory;

    protected $guarded = ['id', 'organization_id', 'material_request_id', 'line_number'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:3'];
    }

    protected static function newFactory(): MaterialRequestItemFactory
    {
        return MaterialRequestItemFactory::new();
    }

    public function materialRequest(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class);
    }
}
