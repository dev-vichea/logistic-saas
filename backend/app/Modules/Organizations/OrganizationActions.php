<?php

namespace App\Modules\Organizations;

use App\Models\User;
use App\Modules\Audit\Audit;
use Closure;
use Illuminate\Support\Facades\DB;

final class OrganizationActions
{
    public function create(User $user, array $data): Organization
    {
        return DB::transaction(function () use ($user, $data) {
            $organization = Organization::create($data);
            $organization->memberships()->create(['user_id' => $user->id, 'role' => Role::Owner]);
            Audit::record($organization, 'organization.created');

            return $organization;
        });
    }

    public function update(OrganizationContext $context, array $data): Organization
    {
        return $this->mutate($context, 'organization.update', function (Organization $organization) use ($data) {
            $organization->update($data);
            Audit::record($organization, 'organization.updated', ['fields' => array_keys($data)]);

            return $organization;
        });
    }

    public function transfer(OrganizationContext $context, int $membershipId): void
    {
        $this->mutate($context, 'ownership.transfer', function (Organization $organization) use ($membershipId) {
            $target = $organization->memberships()->findOrFail($membershipId);
            abort_if($target->role === Role::Owner, 422, 'This member already owns the organization.');
            $organization->memberships()->where('role', 'owner')->update(['role' => 'admin']);
            $target->update(['role' => Role::Owner]);
            Audit::record($organization, 'ownership.transferred', ['membership_id' => $target->id]);
        });
    }

    public function mutate(OrganizationContext $context, string $permission, Closure $action): mixed
    {
        return DB::transaction(function () use ($context, $permission, $action) {
            $organization = Organization::whereKey($context->organization->id)->lockForUpdate()->firstOrFail();
            $membership = $organization->memberships()->where('user_id', auth()->id())->firstOrFail();
            (new OrganizationContext($organization, $membership))->authorize($permission);

            return $action($organization);
        }, 3);
    }
}
