<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Audit\Audit;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use App\Modules\Organizations\Role;
use App\Modules\Team\InvitationNotification;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        Notification::fake();
    }

    private function payload(array $overrides = []): array
    {
        return [...['name' => 'Mekong Transport', 'country_code' => 'KH', 'currency' => 'USD', 'timezone' => 'Asia/Phnom_Penh', 'activities' => ['road_transport', 'customs_brokerage']], ...$overrides];
    }

    private function organization(User $owner): Organization
    {
        $this->actingAs($owner);

        return app(OrganizationActions::class)->create($owner, $this->payload());
    }

    private function invite(Organization $org, User $user, array $data = []): string
    {
        $token = str_repeat('a', 64);
        $org->invitations()->create([...['email' => $user->email, 'role' => 'member', 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addDay()], ...$data]);

        return $token;
    }

    public function test_guest_and_unverified_users_cannot_access_tenant_apis(): void
    {
        $this->getJson('/api/v1/organizations')->assertUnauthorized();
        $this->actingAs(User::factory()->unverified()->create())->postJson('/api/v1/organizations', $this->payload())->assertForbidden();
    }

    public function test_creating_an_organization_creates_owner_audit_and_selection(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner);
        $id = $this->postJson('/api/v1/organizations', $this->payload())->assertCreated()->json('data.id');
        $this->assertDatabaseHas('memberships', ['organization_id' => $id, 'user_id' => $owner->id, 'role' => 'owner']);
        $this->assertDatabaseHas('audit_events', ['organization_id' => $id, 'action' => 'organization.created']);
        $this->getJson('/api/v1/me')->assertJsonPath('data.organization_id', $id);
    }

    public function test_profile_rejects_unknown_activities_and_invalid_region_settings(): void
    {
        $this->actingAs(User::factory()->create());
        $this->postJson('/api/v1/organizations', $this->payload(['activities' => ['shipments'], 'country_code' => 'XX', 'timezone' => 'unknown', 'currency' => 'ABC']))->assertUnprocessable()->assertJsonValidationErrors(['activities.0', 'country_code', 'timezone', 'currency']);
    }

    public function test_organization_listing_only_contains_memberships_and_permissions(): void
    {
        $user = User::factory()->create();
        $mine = $this->organization($user);
        $this->organization(User::factory()->create());
        $this->actingAs($user);
        $this->getJson('/api/v1/organizations')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mine->id)->assertJsonPath('data.0.role', 'owner')->assertJsonFragment(['ownership.transfer']);
    }

    public function test_nonmember_cannot_read_write_or_switch_a_guessed_organization(): void
    {
        $org = $this->organization(User::factory()->create());
        $this->actingAs(User::factory()->create());
        foreach (['', '/members', '/departments', '/invitations', '/audit-events', '/dashboard'] as $suffix) {
            $this->getJson('/api/v1/organizations/'.$org->id.$suffix)->assertNotFound();
        }
        $this->patchJson('/api/v1/organizations/'.$org->id, $this->payload())->assertNotFound();
        $this->postJson('/api/v1/organizations/'.$org->id.'/switch')->assertNotFound();
    }

    public static function roleCases(): array
    {
        return [['owner', true, true, true], ['admin', true, true, true], ['manager', false, true, false], ['member', false, false, false], ['viewer', false, false, false]];
    }

    #[DataProvider('roleCases')]
    public function test_role_matrix_is_enforced_on_the_backend(string $role, bool $team, bool $department, bool $audit): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $user = $owner;
        if ($role !== 'owner') {
            $user = User::factory()->create();
            $org->memberships()->create(['user_id' => $user->id, 'role' => $role]);
        }
        $this->actingAs($user);
        $base = '/api/v1/organizations/'.$org->id;
        $this->getJson($base.'/dashboard')->assertOk();
        $this->postJson($base.'/invitations', ['email' => 'teammate@example.com', 'role' => 'member'])->assertStatus($team ? 201 : 403);
        $this->postJson($base.'/departments', ['name' => 'Operations'])->assertStatus($department ? 201 : 403);
        $this->getJson($base.'/audit-events')->assertStatus($audit ? 200 : 403);
        $this->patchJson($base, $this->payload(['name' => 'Updated']))->assertStatus($team ? 200 : 403);
    }

    public function test_members_cannot_be_modified_through_another_tenant(): void
    {
        $owner = User::factory()->create();
        $a = $this->organization($owner);
        $b = $this->organization($owner);
        $member = $b->memberships()->create(['user_id' => User::factory()->create()->id, 'role' => 'member']);
        $base = '/api/v1/organizations/'.$a->id.'/members/'.$member->id;
        $this->patchJson($base, ['role' => 'admin'])->assertNotFound();
        $this->deleteJson($base)->assertNotFound();
        $this->assertSame(Role::Member, $member->fresh()->role);
    }

    public function test_cross_tenant_departments_are_rejected_on_invites_and_members(): void
    {
        $owner = User::factory()->create();
        $a = $this->organization($owner);
        $b = $this->organization($owner);
        $d = $b->departments()->create(['name' => 'Foreign']);
        $m = $a->memberships()->create(['user_id' => User::factory()->create()->id, 'role' => 'member']);
        $base = '/api/v1/organizations/'.$a->id;
        $this->postJson($base.'/invitations', ['email' => 'person@example.com', 'role' => 'member', 'department_id' => $d->id])->assertUnprocessable()->assertJsonValidationErrors('department_id');
        $this->patchJson($base.'/members/'.$m->id, ['role' => 'admin', 'department_id' => $d->id])->assertUnprocessable();
        $this->patchJson($base.'/departments/'.$d->id, ['name' => 'Changed'])->assertNotFound();
        $this->deleteJson($base.'/departments/'.$d->id)->assertNotFound();
    }

    public function test_database_rejects_cross_tenant_department_assignment(): void
    {
        $owner = User::factory()->create();
        $a = $this->organization($owner);
        $b = $this->organization($owner);
        $d = $b->departments()->create(['name' => 'Foreign']);
        $this->expectException(QueryException::class);
        $a->memberships()->create(['user_id' => User::factory()->create()->id, 'role' => 'member', 'department_id' => $d->id]);
    }

    public function test_owner_cannot_be_removed_demoted_or_assigned_via_member_endpoint(): void
    {
        $org = $this->organization(User::factory()->create());
        $owner = $org->memberships()->first();
        $base = '/api/v1/organizations/'.$org->id;
        $this->patchJson($base.'/members/'.$owner->id, ['role' => 'admin'])->assertUnprocessable();
        $this->deleteJson($base.'/members/'.$owner->id)->assertUnprocessable();
        $this->postJson($base.'/invitations', ['email' => 'evil@example.com', 'role' => 'owner'])->assertUnprocessable();
        $this->assertSame(1, $org->memberships()->where('role', 'owner')->count());
    }

    public function test_ownership_transfer_is_atomic_and_owner_only(): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $other = User::factory()->create();
        $target = $org->memberships()->create(['user_id' => $other->id, 'role' => 'admin']);
        $base = '/api/v1/organizations/'.$org->id;
        $this->actingAs($other)->postJson($base.'/transfer-ownership', ['membership_id' => $target->id])->assertForbidden();
        $this->actingAs($owner)->postJson($base.'/transfer-ownership', ['membership_id' => $target->id])->assertNoContent();
        $this->assertSame(Role::Owner, $target->fresh()->role);
        $this->assertSame(1, $org->memberships()->where('role', 'owner')->count());
        $this->assertDatabaseHas('memberships', ['user_id' => $owner->id, 'organization_id' => $org->id, 'role' => 'admin']);
    }

    public function test_stale_authorization_is_rechecked_inside_mutation_lock(): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $user = User::factory()->create();
        $member = $org->memberships()->create(['user_id' => $user->id, 'role' => 'admin']);
        $ctx = new OrganizationContext($org, $member);
        $org->memberships()->whereKey($member->id)->update(['role' => 'viewer']);
        $this->actingAs($user);
        $this->expectException(HttpException::class);
        app(OrganizationActions::class)->mutate($ctx, 'team.manage', fn () => throw new \LogicException('Must never execute'));
    }

    public function test_invitation_email_contains_token_but_api_and_database_do_not(): void
    {
        $org = $this->organization(User::factory()->create());
        $response = $this->postJson('/api/v1/organizations/'.$org->id.'/invitations', ['email' => 'invitee@example.com', 'role' => 'manager'])->assertCreated()->assertJsonMissingPath('data.token_hash');
        $token = null;
        Notification::assertSentOnDemand(InvitationNotification::class, function ($notification, $channels, $notifiable) use (&$token) {
            $token = $notification->token;

            return $notifiable->routes['mail'] === 'invitee@example.com';
        });
        $this->assertNotNull($token);
        $this->assertDatabaseHas('invitations', ['id' => $response->json('data.id'), 'token_hash' => hash('sha256', $token)]);
        $this->assertStringNotContainsString($token, $response->getContent());
    }

    public function test_accepting_invitation_adds_member_and_is_single_use(): void
    {
        $org = $this->organization(User::factory()->create());
        $invitee = User::factory()->create();
        $d = $org->departments()->create(['name' => 'Operations']);
        $token = $this->invite($org, $invitee, ['role' => 'manager', 'department_id' => $d->id]);
        $this->actingAs($invitee);
        $this->postJson('/api/v1/invitations/accept', ['token' => $token])->assertOk();
        $this->assertDatabaseHas('memberships', ['organization_id' => $org->id, 'user_id' => $invitee->id, 'role' => 'manager', 'department_id' => $d->id]);
        $this->postJson('/api/v1/invitations/accept', ['token' => $token])->assertNotFound();
    }

    public function test_wrong_email_and_unverified_users_cannot_accept_invitation(): void
    {
        $org = $this->organization(User::factory()->create());
        $invitee = User::factory()->unverified()->create();
        $token = $this->invite($org, $invitee);
        $this->actingAs(User::factory()->create())->postJson('/api/v1/invitations/accept', ['token' => $token])->assertForbidden();
        $this->actingAs($invitee)->postJson('/api/v1/invitations/accept', ['token' => $token])->assertForbidden();
        $this->assertDatabaseCount('invitations', 1);
    }

    public function test_expired_and_revoked_invitations_cannot_be_accepted(): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $invitee = User::factory()->create();
        $token = $this->invite($org, $invitee, ['expires_at' => now()->subMinute()]);
        $this->actingAs($invitee)->postJson('/api/v1/invitations/accept', ['token' => $token])->assertStatus(410);
        $invite = $org->invitations()->first();
        $this->actingAs($owner)->deleteJson('/api/v1/organizations/'.$org->id.'/invitations/'.$invite->id)->assertNoContent();
        $this->actingAs($invitee)->postJson('/api/v1/invitations/accept', ['token' => $token])->assertNotFound();
    }

    public function test_resending_invitation_rotates_token_and_updates_role(): void
    {
        $org = $this->organization(User::factory()->create());
        $invitee = User::factory()->create();
        $old = $this->invite($org, $invitee);
        $this->postJson('/api/v1/organizations/'.$org->id.'/invitations', ['email' => $invitee->email, 'role' => 'viewer'])->assertCreated();
        $this->assertDatabaseCount('invitations', 1);
        $this->assertSame('viewer', $org->invitations()->first()->role);
        $this->actingAs($invitee)->postJson('/api/v1/invitations/accept', ['token' => $old])->assertNotFound();
    }

    public function test_accepting_an_existing_membership_never_changes_its_role(): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $token = $this->invite($org, $owner, ['role' => 'viewer']);
        $this->postJson('/api/v1/invitations/accept', ['token' => $token])->assertOk();
        $this->assertSame(Role::Owner, $org->memberships()->first()->role);
    }

    public function test_invitation_cannot_be_revoked_through_another_tenant(): void
    {
        $owner = User::factory()->create();
        $a = $this->organization($owner);
        $b = $this->organization($owner);
        $this->invite($b, User::factory()->create());
        $this->deleteJson('/api/v1/organizations/'.$a->id.'/invitations/'.$b->invitations()->first()->id)->assertNotFound();
    }

    public function test_deleting_department_unassigns_members_and_invitations(): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $d = $org->departments()->create(['name' => 'Operations']);
        $member = $org->memberships()->create(['user_id' => User::factory()->create()->id, 'role' => 'member', 'department_id' => $d->id]);
        $this->invite($org, User::factory()->create(), ['department_id' => $d->id]);
        $this->deleteJson('/api/v1/organizations/'.$org->id.'/departments/'.$d->id)->assertNoContent();
        $this->assertNull($member->fresh()->department_id);
        $this->assertNull($org->invitations()->first()->department_id);
    }

    public function test_department_names_are_unique_per_organization(): void
    {
        $owner = User::factory()->create();
        $a = $this->organization($owner);
        $b = $this->organization($owner);
        $this->postJson('/api/v1/organizations/'.$a->id.'/departments', ['name' => 'Operations'])->assertCreated();
        $this->postJson('/api/v1/organizations/'.$a->id.'/departments', ['name' => 'Operations'])->assertUnprocessable();
        $this->postJson('/api/v1/organizations/'.$b->id.'/departments', ['name' => 'Operations'])->assertCreated();
    }

    public function test_dashboard_and_audit_are_tenant_scoped(): void
    {
        $owner = User::factory()->create();
        $a = $this->organization($owner);
        $b = $this->organization($owner);
        $b->departments()->create(['name' => 'Private']);
        $this->getJson('/api/v1/organizations/'.$a->id.'/dashboard')->assertJsonPath('data.departments', 0)->assertJsonPath('data.members', 1);
        $this->getJson('/api/v1/organizations/'.$a->id.'/audit-events')->assertJsonCount(1, 'data')->assertJsonPath('data.0.organization_id', $a->id);
    }

    public function test_revoked_membership_cannot_reuse_selected_organization(): void
    {
        $owner = User::factory()->create();
        $org = $this->organization($owner);
        $user = User::factory()->create();
        $member = $org->memberships()->create(['user_id' => $user->id, 'role' => 'member']);
        $this->actingAs($user);
        $this->postJson('/api/v1/organizations/'.$org->id.'/switch')->assertOk();
        $member->delete();
        $this->getJson('/api/v1/me')->assertJsonPath('data.organization_id', null);
        $this->getJson('/api/v1/organizations/'.$org->id)->assertNotFound();
    }

    public function test_database_allows_only_one_owner_per_organization(): void
    {
        $organization = $this->organization(User::factory()->create());

        $this->expectException(QueryException::class);
        $organization->memberships()->create([
            'user_id' => User::factory()->create()->id,
            'role' => 'owner',
        ]);
    }

    public function test_request_cannot_override_the_route_tenant(): void
    {
        $owner = User::factory()->create();
        $first = $this->organization($owner);
        $second = $this->organization($owner);

        $this->postJson('/api/v1/organizations/'.$first->id.'/departments', [
            'name' => 'Scoped operations',
            'organization_id' => $second->id,
        ])->assertCreated()->assertJsonPath('data.organization_id', $first->id);

        $this->assertFalse($second->departments()->where('name', 'Scoped operations')->exists());
    }

    public function test_mutation_and_audit_roll_back_together(): void
    {
        $org = $this->organization(User::factory()->create());
        $ctx = new OrganizationContext($org, $org->memberships()->first());
        try {
            app(OrganizationActions::class)->mutate($ctx, 'organization.update', function ($o) {
                $o->update(['name' => 'Not committed']);
                Audit::record($o, 'example');
                throw new \RuntimeException('rollback');
            });
        } catch (\RuntimeException) {
        }
        $this->assertSame('Mekong Transport', $org->fresh()->name);
        $this->assertDatabaseMissing('audit_events', ['action' => 'example']);
    }
}
