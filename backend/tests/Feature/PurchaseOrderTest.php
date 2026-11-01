<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    private int $supplierId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        $this->owner = User::factory()->create();
        $this->organization = app(OrganizationActions::class)->create($this->owner, [
            'name' => 'China HQ', 'country_code' => 'CN', 'currency' => 'USD',
            'timezone' => 'Asia/Shanghai', 'activities' => ['freight_forwarding'],
        ]);
        $this->supplierId = $this->organization->partners()->create([
            'name' => 'Wealdone', 'roles' => ['supplier'], 'country_code' => 'CN',
        ])->id;
        $this->actingAs($this->owner);
    }

    private function orders(Organization $organization, string $path = ''): string
    {
        return "/api/v1/organizations/{$organization->id}/purchase-orders/{$path}";
    }

    private function requests(Organization $organization, string $path = ''): string
    {
        return "/api/v1/organizations/{$organization->id}/material-requests/{$path}";
    }

    private function materialRequest(bool $submit = true): array
    {
        $request = $this->postJson($this->requests($this->organization), [
            'title' => 'Fabric for production',
            'items' => [
                ['description' => 'Cotton fabric', 'quantity' => 100, 'unit' => 'METER'],
                ['description' => 'Zipper', 'quantity' => 50, 'unit' => 'PCS'],
            ],
        ])->assertCreated()->json('data');
        if ($submit) {
            $this->postJson($this->requests($this->organization, $request['id'].'/submit'))->assertOk();
        }

        return $request;
    }

    private function payload(array $request): array
    {
        return [
            'material_request_id' => $request['id'],
            'supplier_partner_id' => $this->supplierId,
            'expected_delivery_date' => '2026-12-15',
            'items' => [
                ['material_request_item_id' => $request['items'][0]['id'], 'quantity' => 100, 'unit_price' => 2.5],
                ['material_request_item_id' => $request['items'][1]['id'], 'quantity' => 50, 'unit_price' => 1.25],
            ],
        ];
    }

    public function test_purchase_order_is_linked_editable_as_draft_and_issued(): void
    {
        $request = $this->materialRequest();
        $created = $this->postJson($this->orders($this->organization), $this->payload($request))
            ->assertCreated()->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.supplier_name', 'Wealdone')
            ->assertJsonPath('data.items.0.description', 'Cotton fabric');
        $id = $created->json('data.id');
        $this->assertSame('PO-'.now()->format('Y').'-0001', $created->json('data.po_number'));
        $this->getJson($this->requests($this->organization, (string) $request['id']))
            ->assertOk()->assertJsonPath('data.purchase_order.id', $id);

        $changed = $this->payload($request);
        $changed['items'][0]['quantity'] = 80;
        $changed['items'][0]['unit_price'] = 3.25;
        $this->patchJson($this->orders($this->organization, (string) $id), $changed)
            ->assertOk()->assertJsonPath('data.items.0.quantity', '80.000')->assertJsonCount(2, 'data.items');
        $this->getJson($this->orders($this->organization).'?q=Wealdone')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.items_count', 2);
        $this->postJson($this->orders($this->organization, "$id/issue"))
            ->assertOk()->assertJsonPath('data.status', 'issued');
        $this->patchJson($this->orders($this->organization, (string) $id), $changed)->assertStatus(409);
        $this->postJson($this->orders($this->organization, "$id/issue"))->assertStatus(409);
        $this->postJson($this->orders($this->organization), $changed)->assertStatus(409);
        $this->assertDatabaseHas('audit_events', ['organization_id' => $this->organization->id, 'action' => 'purchase_order.issued']);
    }

    public function test_source_supplier_quantity_and_tenant_constraints(): void
    {
        $draft = $this->materialRequest(false);
        $this->postJson($this->orders($this->organization), $this->payload($draft))->assertStatus(409);
        $this->postJson($this->requests($this->organization, $draft['id'].'/submit'))->assertOk();
        $invalid = $this->payload($draft);
        $invalid['items'][0]['quantity'] = 101;
        $this->postJson($this->orders($this->organization), $invalid)->assertStatus(422);
        $invalid = $this->payload($draft);
        $invalid['items'][0]['unit_price'] = -1;
        $this->postJson($this->orders($this->organization), $invalid)
            ->assertUnprocessable()->assertJsonValidationErrors(['items.0.unit_price']);

        $otherRequest = $this->materialRequest();
        $invalid = $this->payload($draft);
        $invalid['items'][0]['material_request_item_id'] = $otherRequest['items'][0]['id'];
        $this->postJson($this->orders($this->organization), $invalid)->assertNotFound();
        $notSupplier = $this->organization->partners()->create(['name' => 'Customer', 'roles' => ['customer'], 'country_code' => 'KH']);
        $invalid = $this->payload($draft);
        $invalid['supplier_partner_id'] = $notSupplier->id;
        $this->postJson($this->orders($this->organization), $invalid)->assertStatus(422);

        $foreignUser = User::factory()->create();
        $foreignOrganization = app(OrganizationActions::class)->create($foreignUser, [
            'name' => 'Other Buyer', 'country_code' => 'KH', 'currency' => 'USD',
            'timezone' => 'Asia/Phnom_Penh', 'activities' => ['freight_forwarding'],
        ]);
        $foreignSupplier = $foreignOrganization->partners()->create(['name' => 'Foreign', 'roles' => ['supplier'], 'country_code' => 'KH']);
        $invalid = $this->payload($draft);
        $invalid['supplier_partner_id'] = $foreignSupplier->id;
        $this->postJson($this->orders($this->organization), $invalid)->assertNotFound();
        $this->actingAs($foreignUser);
        $this->getJson($this->orders($this->organization))->assertNotFound();
        $this->postJson($this->orders($this->organization), $this->payload($draft))->assertNotFound();
        $this->getJson($this->orders($foreignOrganization))->assertOk()->assertJsonPath('total', 0);

        $this->actingAs($this->owner);
        $order = $this->postJson($this->orders($this->organization), $this->payload($draft))->assertCreated()->json('data');
        $this->actingAs($foreignUser);
        $this->getJson($this->orders($this->organization, (string) $order['id']))->assertNotFound();
        $this->patchJson($this->orders($this->organization, (string) $order['id']), $this->payload($draft))->assertNotFound();
        $this->postJson($this->orders($this->organization, $order['id'].'/issue'))->assertNotFound();

        $this->expectException(QueryException::class);
        DB::table('purchase_order_items')->insert([
            'organization_id' => $foreignOrganization->id,
            'purchase_order_id' => $order['id'],
            'material_request_id' => $draft['id'],
            'material_request_item_id' => $draft['items'][0]['id'],
            'line_number' => 9, 'description' => 'Foreign', 'quantity' => 1,
            'unit' => 'PCS', 'unit_price' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
