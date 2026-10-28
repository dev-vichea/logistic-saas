<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use App\Modules\Partners\BusinessPartner;
use App\Modules\Partners\PartnerActions;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PartnerDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    private Organization $other;

    private string $base;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        $this->owner = User::factory()->create();
        $this->actingAs($this->owner);
        $payload = ['name' => 'Mekong', 'country_code' => 'KH', 'currency' => 'USD', 'timezone' => 'Asia/Phnom_Penh', 'activities' => ['road_transport']];
        $this->organization = app(OrganizationActions::class)->create($this->owner, $payload);
        $this->other = app(OrganizationActions::class)->create($this->owner, [...$payload, 'name' => 'Other']);
        $this->base = '/api/v1/organizations/'.$this->organization->id.'/partners';
    }

    private function partner(?Organization $organization = null, array $data = []): BusinessPartner
    {
        return BusinessPartner::factory()->create(['organization_id' => ($organization ?? $this->organization)->id, ...$data]);
    }

    private function locationData(array $overrides = []): array
    {
        return ['name' => 'Phnom Penh warehouse', 'type' => 'warehouse', 'address_line_1' => 'Street 2004', 'city' => 'Phnom Penh', 'country_code' => 'KH', ...$overrides];
    }

    public function test_partner_crud_multiple_roles_and_audit_without_mekong_account(): void
    {
        $users = User::count();
        $id = $this->postJson($this->base, ['name' => 'អង្គរ Logistics', 'code' => ' kh-001 ', 'roles' => ['customer', 'shipper', 'carrier'], 'country_code' => 'KH', 'tax_number' => 'VAT-01', 'notes' => 'Private operational notes'])->assertCreated()->assertJsonPath('data.code', 'KH-001')->json('data.id');
        $this->getJson($this->base.'/'.$id)->assertOk()->assertJsonPath('data.roles', ['customer', 'shipper', 'carrier'])->assertJsonPath('data.contacts_count', 0);
        $this->patchJson($this->base.'/'.$id, ['name' => 'Updated partner'])->assertOk()->assertJsonPath('data.country_code', 'KH');
        $this->assertSame($users, User::count());
        $event = $this->organization->audits()->where('action', 'partner.updated')->firstOrFail();
        $this->assertEquals(['partner_id' => $id, 'fields' => ['name']], $event->metadata);
        $this->assertStringNotContainsString('Private operational notes', $event->toJson());
    }

    public static function roles(): array
    {
        return [['owner', true, true], ['admin', true, true], ['manager', true, true], ['member', true, false], ['viewer', false, false]];
    }

    #[DataProvider('roles')]
    public function test_permissions_for_all_roles(string $role, bool $manage, bool $archive): void
    {
        $partner = $this->partner();
        $user = $this->owner;
        if ($role !== 'owner') {
            $user = User::factory()->create();
            $this->organization->memberships()->create(['user_id' => $user->id, 'role' => $role]);
        }
        $this->actingAs($user);
        $this->getJson($this->base)->assertOk();
        $this->getJson($this->base.'/catalog')->assertOk();
        $this->getJson($this->base.'/'.$partner->id)->assertOk();
        $this->postJson($this->base, ['name' => 'New', 'roles' => ['supplier'], 'country_code' => 'SG'])->assertStatus($manage ? 201 : 403);
        $this->patchJson($this->base.'/'.$partner->id, ['phone' => '+855 12 123456'])->assertStatus($manage ? 200 : 403);
        $this->postJson($this->base.'/'.$partner->id.'/contacts', ['name' => 'Contact'])->assertStatus($manage ? 201 : 403);
        $this->postJson($this->base.'/'.$partner->id.'/locations', $this->locationData())->assertStatus($manage ? 201 : 403);
        $this->postJson($this->base.'/'.$partner->id.'/archive')->assertStatus($archive ? 200 : 403);
        $this->postJson($this->base.'/'.$partner->id.'/restore')->assertStatus($archive ? 200 : 403);
    }

    public function test_guests_unverified_users_and_nonmembers_are_rejected(): void
    {
        auth()->forgetGuards();
        $this->app['auth']->guard()->logout();
        $this->getJson($this->base)->assertUnauthorized();
        $this->actingAs(User::factory()->unverified()->create())->getJson($this->base)->assertForbidden();
        $this->actingAs(User::factory()->create())->getJson($this->base)->assertNotFound();
    }

    public function test_all_partner_routes_hide_foreign_tenant_ids_even_for_member_of_both(): void
    {
        $foreign = $this->partner($this->other);
        $url = $this->base.'/'.$foreign->id;
        $this->getJson($url)->assertNotFound();
        $this->patchJson($url, ['name' => 'Intrusion'])->assertNotFound();
        $this->postJson($url.'/archive')->assertNotFound();
        $this->postJson($url.'/restore')->assertNotFound();
        foreach (['contacts', 'locations'] as $child) {
            $this->getJson($url.'/'.$child)->assertNotFound();
        }
        $this->postJson($url.'/contacts', ['name' => 'Bad'])->assertNotFound();
        $this->postJson($url.'/locations', $this->locationData())->assertNotFound();
        $this->getJson($this->base.'?status=all')->assertJsonCount(0, 'data');
    }

    public function test_nested_records_cannot_be_read_or_written_through_different_partner_or_tenant(): void
    {
        $first = $this->partner();
        $second = $this->partner();
        $foreign = $this->partner($this->other);
        $contact = $this->postJson($this->base.'/'.$first->id.'/contacts', ['name' => 'Private'])->assertCreated()->json('data.id');
        $location = $this->postJson($this->base.'/'.$first->id.'/locations', $this->locationData())->assertCreated()->json('data.id');
        foreach ([$this->base.'/'.$second->id, '/api/v1/organizations/'.$this->other->id.'/partners/'.$foreign->id] as $url) {
            $this->getJson($url.'/contacts/'.$contact)->assertNotFound();
            $this->patchJson($url.'/contacts/'.$contact, ['name' => 'Intrusion'])->assertNotFound();
            $this->deleteJson($url.'/contacts/'.$contact)->assertNotFound();
            $this->getJson($url.'/locations/'.$location)->assertNotFound();
            $this->patchJson($url.'/locations/'.$location, ['name' => 'Intrusion'])->assertNotFound();
            $this->deleteJson($url.'/locations/'.$location)->assertNotFound();
        }
    }

    public function test_directory_search_filters_sorting_and_pagination_remain_tenant_scoped(): void
    {
        $a = $this->partner(null, ['name' => 'Alpha logistics', 'code' => 'A01', 'roles' => ['customer', 'shipper'], 'country_code' => 'KH']);
        $b = $this->partner(null, ['name' => 'Beta transport', 'roles' => ['carrier'], 'country_code' => 'TH']);
        $this->partner($this->other, ['name' => 'Alpha private', 'roles' => ['customer'], 'country_code' => 'KH']);
        $this->getJson($this->base.'?q=ALPHA&role=customer&country_code=KH')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $a->id);
        $this->getJson($this->base.'?sort=name&direction=desc&per_page=1')->assertJsonPath('total', 2)->assertJsonPath('last_page', 2)->assertJsonPath('data.0.id', $b->id);
        $this->getJson($this->base.'?sort=name&direction=desc&per_page=1&page=2')->assertJsonPath('data.0.id', $a->id);
        $this->postJson($this->base.'/'.$b->id.'/contacts', ['name' => 'Sophea Unique'])->assertCreated();
        $this->getJson($this->base.'?q=Sophea')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $b->id);
        $this->postJson($this->base.'/'.$a->id.'/locations', $this->locationData(['name' => 'Unique pickup point']))->assertCreated();
        $this->getJson($this->base.'?q=pickup')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $a->id);
    }

    public function test_search_wildcards_are_literal_and_do_not_expand_results(): void
    {
        $a = $this->partner(null, ['name' => '100%_Road']);
        $this->partner(null, ['name' => 'Road']);
        $this->getJson($this->base.'?'.http_build_query(['q' => '%_']))->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $a->id);
        $this->getJson($this->base.'?'.http_build_query(['q' => "' OR 1=1 --"]))->assertJsonCount(0, 'data');
    }

    public function test_numeric_zero_search_is_not_treated_as_empty(): void
    {
        $match = $this->partner(null, ['name' => 'Route 0']);
        $this->partner(null, ['name' => 'Route Alpha']);
        $this->getJson($this->base.'?q=0')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $match->id);
    }

    public function test_partner_and_query_validation(): void
    {
        $this->postJson($this->base, ['name' => '', 'roles' => ['unknown', 'unknown'], 'country_code' => 'ZZ', 'website' => 'javascript:alert(1)', 'code' => []])->assertUnprocessable()->assertJsonValidationErrors(['name', 'roles.0', 'country_code', 'website', 'code']);
        foreach ([['sort' => 'name; DROP TABLE users'], ['direction' => 'wrong'], ['per_page' => 101], ['status' => 'deleted'], ['role' => 'unknown'], ['country_code' => 'ZZ'], ['q' => str_repeat('x', 121)], ['page' => 0]] as $filter) {
            $this->getJson($this->base.'?'.http_build_query($filter))->assertUnprocessable();
        }
        $this->postJson($this->base, ['name' => 'New', 'roles' => [], 'country_code' => 'KH'])->assertUnprocessable();
    }

    public function test_partner_codes_are_unique_within_tenant_including_archived_records(): void
    {
        $partner = $this->partner(null, ['code' => 'KH-01']);
        $this->postJson($this->base.'/'.$partner->id.'/archive')->assertOk();
        $payload = ['name' => 'New', 'roles' => ['customer'], 'country_code' => 'KH', 'code' => 'kh-01'];
        $this->postJson($this->base, $payload)->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->postJson('/api/v1/organizations/'.$this->other->id.'/partners', $payload)->assertCreated();
    }

    public function test_archive_preserves_children_is_idempotent_and_restore_unlocks_changes(): void
    {
        $partner = $this->partner();
        $url = $this->base.'/'.$partner->id;
        $contact = $this->postJson($url.'/contacts', ['name' => 'Contact'])->assertCreated()->json('data.id');
        $location = $this->postJson($url.'/locations', $this->locationData())->assertCreated()->json('data.id');
        $this->postJson($url.'/archive')->assertOk();
        $this->postJson($url.'/archive')->assertOk();
        $this->getJson($this->base)->assertJsonCount(0, 'data');
        $this->getJson($this->base.'?status=archived')->assertJsonCount(1, 'data');
        $this->getJson($url.'/contacts')->assertJsonCount(1, 'data');
        $this->getJson($url.'/locations')->assertJsonCount(1, 'data');
        $this->patchJson($url, ['name' => 'No'])->assertConflict();
        $this->postJson($url.'/contacts', ['name' => 'No'])->assertConflict();
        $this->patchJson($url.'/contacts/'.$contact, ['name' => 'No'])->assertConflict();
        $this->deleteJson($url.'/contacts/'.$contact)->assertConflict();
        $this->postJson($url.'/locations', $this->locationData())->assertConflict();
        $this->patchJson($url.'/locations/'.$location, ['name' => 'No'])->assertConflict();
        $this->deleteJson($url.'/locations/'.$location)->assertConflict();
        $this->assertSame(1, $this->organization->audits()->where('action', 'partner.archived')->count());
        $this->postJson($url.'/restore')->assertOk();
        $this->patchJson($url, ['name' => 'Restored'])->assertOk();
    }

    public function test_multiple_contacts_primary_reassignment_edit_and_delete(): void
    {
        $partner = $this->partner();
        $url = $this->base.'/'.$partner->id.'/contacts';
        $a = $this->postJson($url, ['name' => 'First', 'email' => 'first@example.com', 'is_primary' => true])->assertCreated()->json('data.id');
        $b = $this->postJson($url, ['name' => 'Second', 'is_primary' => true])->assertCreated()->json('data.id');
        $this->getJson($url.'/'.$a)->assertJsonPath('data.is_primary', false);
        $this->patchJson($url.'/'.$b, ['job_title' => 'Manager', 'is_primary' => true])->assertOk();
        $this->getJson($url.'/'.$b)->assertJsonPath('data.is_primary', true);
        $this->getJson($url)->assertJsonCount(2, 'data')->assertJsonPath('data.0.id', $b);
        $this->deleteJson($url.'/'.$a)->assertNoContent();
        $this->getJson($url.'/'.$a)->assertNotFound();
        $this->assertDatabaseHas('audit_events', ['organization_id' => $this->organization->id, 'action' => 'partner_contact.deleted']);
    }

    public function test_locations_support_coordinates_independent_country_primary_and_crud(): void
    {
        $partner = $this->partner();
        $url = $this->base.'/'.$partner->id.'/locations';
        $a = $this->postJson($url, $this->locationData(['latitude' => 11.5564, 'longitude' => 104.9282, 'is_primary' => true]))->assertCreated()->json('data.id');
        $b = $this->postJson($url, $this->locationData(['name' => 'Singapore site', 'country_code' => 'SG', 'is_primary' => true]))->assertCreated()->json('data.id');
        $this->getJson($url.'/'.$a)->assertJsonPath('data.is_primary', false)->assertJsonPath('data.latitude', 11.5564);
        $this->patchJson($url.'/'.$b, ['is_primary' => true, 'address_line_2' => 'Floor 2'])->assertOk();
        $this->getJson($url.'/'.$b)->assertJsonPath('data.is_primary', true);
        $this->patchJson($url.'/'.$a, ['latitude' => null])->assertUnprocessable();
        $this->patchJson($url.'/'.$a, ['latitude' => null, 'longitude' => null])->assertOk();
        $this->deleteJson($url.'/'.$b)->assertNoContent();
    }

    public function test_contact_and_location_validation_and_reparenting_are_rejected(): void
    {
        $partner = $this->partner();
        $url = $this->base.'/'.$partner->id;
        $this->postJson($url.'/contacts', ['name' => 'Contact', 'email' => 'invalid', 'organization_id' => $this->other->id])->assertUnprocessable();
        $this->postJson($url.'/locations', $this->locationData(['latitude' => 91, 'longitude' => 181, 'type' => 'bad', 'country_code' => 'ZZ']))->assertUnprocessable();
        $this->postJson($url.'/locations', $this->locationData(['latitude' => 11]))->assertUnprocessable();
        $this->postJson($url.'/locations', $this->locationData(['business_partner_id' => $partner->id]))->assertUnprocessable();
        $this->postJson($this->base, ['name' => 'New', 'roles' => ['customer'], 'country_code' => 'KH', 'organization_id' => $this->other->id])->assertUnprocessable();
    }

    public static function childTables(): array
    {
        return [['partner_contacts'], ['locations']];
    }

    #[DataProvider('childTables')]
    public function test_database_enforces_child_tenant_consistency(string $table): void
    {
        $partner = $this->partner();
        $data = $table === 'locations' ? $this->locationData() : ['name' => 'Contact'];
        $this->expectException(QueryException::class);
        DB::table($table)->insert(['organization_id' => $this->other->id, 'business_partner_id' => $partner->id, ...$data]);
    }

    public function test_stale_partner_permissions_are_rechecked_inside_transaction(): void
    {
        $member = $this->organization->memberships()->first();
        $context = new OrganizationContext($this->organization, $member);
        $member->update(['role' => 'viewer']);
        $this->expectException(HttpException::class);
        app(PartnerActions::class)->create($context, ['name' => 'Denied', 'roles' => ['customer'], 'country_code' => 'KH']);
    }

    public function test_global_country_catalog_does_not_change_v01_catalog(): void
    {
        $this->getJson($this->base.'/catalog')->assertOk()->assertJsonPath('data.roles.customer', 'Customer')->assertJsonPath('data.countries.US', 'United States');
        $this->getJson('/api/v1/catalog')->assertOk()->assertJsonPath('data.countries.KH', 'Cambodia')->assertJsonMissingPath('data.countries.US');
    }
}
