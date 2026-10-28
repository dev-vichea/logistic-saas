<?php

namespace App\Modules\Audit;

use App\Modules\Organizations\Organization;

final class Audit
{
    // Only explicit, non-secret metadata is recorded. Called inside mutation transactions.
    public static function record(Organization $organization, string $action, array $metadata = []): void
    {
        AuditEvent::create(['organization_id' => $organization->id, 'actor_id' => auth()->id(), 'action' => $action, 'metadata' => $metadata, 'created_at' => now()]);
    }
}
