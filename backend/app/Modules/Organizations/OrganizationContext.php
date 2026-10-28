<?php

namespace App\Modules\Organizations;

use Illuminate\Http\Request;

// Request-scoped value. Never retain tenant state in static properties or queue workers.
final class OrganizationContext
{
    public function __construct(public readonly Organization $organization, public readonly Membership $membership) {}

    public static function from(Request $request): self
    {
        return $request->attributes->get(self::class);
    }

    public function authorize(string $permission): void
    {
        abort_unless(in_array($permission, $this->membership->role->permissions(), true), 403, 'You do not have permission to perform this action.');
    }
}
