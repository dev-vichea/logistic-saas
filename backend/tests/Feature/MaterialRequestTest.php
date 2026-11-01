<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\Role;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MaterialRequestTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        $this->owner = User::factory()->create();
        $this->organization = app(OrganizationActions::class)->create($this->owner, [
            'name' => 'China HQ',
            'country_code' => 'CN',
            'currency' => 'USD',
            'timezone' => 'Asia/Shanghai',
            'activities' => ['freight_forwarding'],
        ]);
        $this->actingAs($this->owner);
    }

    private function url(Organization $organization, string $path = ''): string
    {
        return "/api/v1/organizations/{$organization->id}/material-requests/{$path}";
    }

    private function payload(): array
    {
        return [
            'title' => 'Fabric for next production run',
            'needed_by' => '2026-12-01',
            'items' => [
                ['description' => 'Cotton fabric', 'specification' => 'Blue, 150 cm', 'quantity' => 10000, 'unit' => 'METER'],
                ['description' => 'Metal zipper', 'quantity' => 5000, 'unit' => 'PCS'],
            ],
        ];
    }

    public function test_create_list_edit_and_submit_material_request(): void
    {
        $created = $this->postJson($this->url($this->organization), $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.items.0.quantity', '10000.000');
        $id = $created->json('data.id');
        $firstItemId = $created->json('data.items.0.id');
        $secondItemId = $created->json('data.items.1.id');

        $this->getJson($this->url($this->organization).'?q=Fabric')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.items_count', 2);

        $changed = $this->payload();
        $changed['items'] = [
            ['id' => $secondItemId, 'description' => 'Metal zipper', 'quantity' => 6000, 'unit' => 'PCS'],
            ['id' => $firstItemId, 'description' => 'Cotton fabric', 'quantity' => 10000, 'unit' => 'METER'],
        ];
        $this->patchJson($this->url($this->organization, (string) $id), $changed)
            ->assertOk()->assertJsonPath('data.items.0.id', $secondItemId)
            ->assertJsonPath('data.items.0.quantity', '6000.000');

        $this->postJson($this->url($this->organization, "$id/submit"))
            ->assertOk()->assertJsonPath('data.status', 'submitted');
        $this->patchJson($this->url($this->organization, (string) $id), $changed)->assertStatus(409);
        $this->postJson($this->url($this->organization, "$id/submit"))->assertStatus(409);
        $this->assertDatabaseHas('audit_events', ['organization_id' => $this->organization->id, 'action' => 'material_request.submitted']);
    }

    public function test_other_tenants_and_other_parent_items_are_rejected(): void
    {
        $first = $this->postJson($this->url($this->organization), $this->payload())->assertCreated()->json('data');
        $second = $this->postJson($this->url($this->organization), $this->payload())->assertCreated()->json('data');
        $foreignUser = User::factory()->create();
        $foreignOrganization = app(OrganizationActions::class)->create($foreignUser, [
            'name' => 'Other Buyer', 'country_code' => 'KH', 'currency' => 'USD',
            'timezone' => 'Asia/Phnom_Penh', 'activities' => ['freight_forwarding'],
        ]);
        $this->actingAs($foreignUser);
        $this->getJson($this->url($this->organization, (string) $first['id']))->assertNotFound();
        $this->patchJson($this->url($this->organization, (string) $first['id']), $this->payload())->assertNotFound();
        $this->postJson($this->url($this->organization, $first['id'].'/submit'))->assertNotFound();
        $this->getJson($this->url($foreignOrganization))->assertOk()->assertJsonPath('total', 0);

        $this->actingAs($this->owner);
        $changed = $this->payload();
        $changed['items'][0]['id'] = $second['items'][0]['id'];
        $this->patchJson($this->url($this->organization, (string) $first['id']), $changed)->assertNotFound();
        $this->assertDatabaseHas('material_request_items', ['id' => $first['items'][0]['id'], 'quantity' => 10000]);

        $this->expectException(QueryException::class);
        DB::table('material_request_items')->insert([
            'organization_id' => $foreignOrganization->id,
            'material_request_id' => $first['id'],
            'line_number' => 9,
            'description' => 'Foreign item',
            'quantity' => 1,
            'unit' => 'PCS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_validation_and_all_membership_roles_can_use_first_workflow(): void
    {
        $invalid = $this->payload();
        $invalid['items'][0]['quantity'] = 0;
        $this->postJson($this->url($this->organization), $invalid)
            ->assertUnprocessable()->assertJsonValidationErrors(['items.0.quantity']);

        $viewer = User::factory()->create();
        $this->organization->memberships()->create(['user_id' => $viewer->id, 'role' => Role::Viewer]);
        $this->actingAs($viewer);
        $this->postJson($this->url($this->organization), $this->payload())->assertCreated();

        $this->assertDatabaseCount('material_requests', 1);
    }
}
