<?php

namespace App\Modules\Team;

use App\Models\User;
use App\Modules\Audit\Audit;
use App\Modules\Organizations\Membership;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use App\Modules\Organizations\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class TeamActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function invite(OrganizationContext $ctx, array $data): Invitation
    {
        return $this->organizations->mutate($ctx, 'team.manage', function ($org) use ($data) {
            if ($org->memberships()->whereHas('user', fn ($q) => $q->where('email', $data['email']))->exists()) {
                throw ValidationException::withMessages(['email' => 'This person is already a member.']);
            }
            $token = Str::random(64);
            $invitation = $org->invitations()->updateOrCreate(['email' => $data['email']], ['role' => $data['role'], 'department_id' => $data['department_id'] ?? null, 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addDays(7)]);
            Notification::route('mail', $invitation->email)->notify(new InvitationNotification($token, $org->name));
            Audit::record($org, 'invitation.sent', ['invitation_id' => $invitation->id]);

            return $invitation;
        });
    }

    public function revoke(OrganizationContext $context, int $id): void
    {
        $this->organizations->mutate($context, 'team.manage', function (Organization $organization) use ($id) {
            $organization->invitations()->findOrFail($id)->delete();
            Audit::record($organization, 'invitation.revoked', ['invitation_id' => $id]);
        });
    }

    public function accept(User $user, string $token): Organization
    {
        $hash = hash('sha256', $token);
        $candidate = Invitation::where('token_hash', $hash)->firstOrFail();

        return DB::transaction(function () use ($user, $hash, $candidate) {
            // Same lock order as every tenant mutation prevents accept/revoke races.
            $org = Organization::whereKey($candidate->organization_id)->lockForUpdate()->firstOrFail();
            $invite = $org->invitations()->where('token_hash', $hash)->lockForUpdate()->firstOrFail();
            abort_unless(hash_equals($invite->email, $user->email), 403, 'Sign in with the email address this invitation was sent to.');
            abort_if($invite->expires_at->isPast(), 410, 'This invitation has expired. Ask an administrator to resend it.');
            $org->memberships()->firstOrCreate(['user_id' => $user->id], ['role' => $invite->role, 'department_id' => $invite->department_id]);
            Audit::record($org, 'invitation.accepted', ['invitation_id' => $invite->id]);
            $invite->delete();

            return $org;
        }, 3);
    }

    public function update(OrganizationContext $ctx, int $id, array $data): Membership
    {
        return $this->organizations->mutate($ctx, 'team.manage', function ($org) use ($id, $data) {
            $member = $org->memberships()->findOrFail($id);
            abort_if($member->role === Role::Owner, 422, 'Transfer ownership before changing the owner.');
            $member->update(['role' => $data['role'], 'department_id' => $data['department_id'] ?? null]);
            Audit::record($org, 'member.updated', ['membership_id' => $id, 'role' => $data['role']]);

            return $member->load('user', 'department');
        });
    }

    public function remove(OrganizationContext $ctx, int $id): void
    {
        $this->organizations->mutate($ctx, 'team.manage', function ($org) use ($id) {
            $member = $org->memberships()->findOrFail($id);
            abort_if($member->role === Role::Owner, 422, 'Transfer ownership before removing the owner.');
            $member->delete();
            Audit::record($org, 'member.removed', ['membership_id' => $id]);
        });
    }
}
