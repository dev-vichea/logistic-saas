<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Freight\Shipment;
use App\Modules\Locations\Location;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomsManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $ownerA;

    private User $ownerB;

    private User $viewerA;

    private Organization $orgA;

    private Organization $orgB;

    private BusinessPartner $customerA;

    private BusinessPartner $brokerA;

    private Location $portA;

    private Location $factoryA;

    private Shipment $shipmentA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);

        $actions = app(OrganizationActions::class);

        // Tenant A (Mekong Global Logistics)
        $this->ownerA = User::factory()->create();
        $this->orgA = $actions->create($this->ownerA, [
            'name' => 'Mekong Global Logistics',
            'country_code' => 'KH',
            'currency' => 'USD',
            'timezone' => 'Asia/Phnom_Penh',
            'activities' => ['freight_forwarding', 'customs_brokerage'],
        ]);

        // Viewer in Tenant A
        $this->viewerA = User::factory()->create();
        $this->orgA->memberships()->create([
            'user_id' => $this->viewerA->id,
            'role' => 'viewer',
        ]);

        // Tenant B (Adversary)
        $this->ownerB = User::factory()->create();
        $this->orgB = $actions->create($this->ownerB, [
            'name' => 'Rival Logistics Co',
            'country_code' => 'VN',
            'currency' => 'USD',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'activities' => ['freight_forwarding'],
        ]);

        // Tenant A Data
        $this->customerA = $this->orgA->partners()->create([
            'name' => 'Xin Cai Fu Garments (Cambodia) Ltd',
            'roles' => ['customer', 'consignee'],
            'country_code' => 'KH',
            'tax_number' => 'L001-902303477',
        ]);

        $this->brokerA = $this->orgA->partners()->create([
            'name' => 'Sihanoukville Customs Clearance Agency',
            'roles' => ['broker'],
            'country_code' => 'KH',
        ]);

        $this->portA = $this->orgA->locations()->create([
            'business_partner_id' => $this->customerA->id,
            'name' => 'Sihanoukville Autonomous Port',
            'type' => 'port',
            'address_line_1' => 'PAS Terminal, Mittapheap',
            'country_code' => 'KH',
            'city' => 'Sihanoukville',
        ]);

        $this->factoryA = $this->orgA->locations()->create([
            'business_partner_id' => $this->customerA->id,
            'name' => 'Xin Cai Fu Factory PPSEZ',
            'type' => 'warehouse',
            'address_line_1' => 'National Road 4, PPSEZ',
            'country_code' => 'KH',
            'city' => 'Phnom Penh',
        ]);

        $this->shipmentA = $this->orgA->shipments()->create([
            'shipment_number' => 'SHP-2026-XCF1',
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->portA->id,
            'destination_location_id' => $this->factoryA->id,
            'transport_mode' => 'ocean_fcl',
            'status' => 'planned',
            'customs_status' => 'pending_docs',
        ]);
    }

    public function test_user_can_create_cdc_master_list_and_items(): void
    {
        $response = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/cdc-master-lists", [
            'qip_number' => 'QIP # 211-26',
            'company_name' => 'XIN CAI FU (CAMBODIA) CO., LTD.',
            'tin_number' => 'L001-902303477',
            'approval_reference' => 'CDC-2026.09.03/2027.09.03',
            'effective_year' => 2026,
            'valid_from' => '2026-09-03',
            'valid_until' => '2027-09-03',
            'notes' => 'Duty-Free Exemption Master List for Garment Factory Machinery and Materials.',
            'items' => [
                [
                    'category' => 'machinery',
                    'item_number' => 1,
                    'description_original' => '工业缝纫机',
                    'description_english' => 'One needle sewing machine',
                    'hs_code' => '8452.29.00',
                    'unit_of_measure' => 'SET',
                    'approved_quantity' => 400,
                    'unit_price_usd' => 350.00,
                ],
                [
                    'category' => 'raw_materials',
                    'item_number' => 2,
                    'description_original' => '金属拉链',
                    'description_english' => 'Metal Zipper',
                    'hs_code' => '9607.11.00',
                    'unit_of_measure' => 'METER',
                    'approved_quantity' => 50000,
                    'unit_price_usd' => 0.45,
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.qip_number', 'QIP # 211-26')
            ->assertJsonPath('data.approval_reference', 'CDC-2026.09.03/2027.09.03');

        $listId = $response->json('data.id');

        $this->assertDatabaseHas('cdc_master_lists', [
            'id' => $listId,
            'organization_id' => $this->orgA->id,
            'qip_number' => 'QIP # 211-26',
        ]);

        $this->assertDatabaseHas('cdc_master_items', [
            'cdc_master_list_id' => $listId,
            'organization_id' => $this->orgA->id,
            'description_english' => 'One needle sewing machine',
            'approved_quantity' => 400.000,
            'remaining_quantity' => 400.000,
            'consumed_quantity' => 0.000,
        ]);
    }

    public function test_user_can_create_customs_declaration_and_deduct_cdc_quota(): void
    {
        // 1. Create CDC Master List
        $cdcList = $this->orgA->cdcMasterLists()->create([
            'qip_number' => 'QIP # 211-26',
            'company_name' => 'XIN CAI FU (CAMBODIA) CO., LTD.',
            'tin_number' => 'L001-902303477',
            'approval_reference' => 'CDC-2026.09.03',
            'effective_year' => 2026,
            'status' => 'active',
        ]);

        $itemSewing = $cdcList->items()->create([
            'organization_id' => $this->orgA->id,
            'category' => 'machinery',
            'item_number' => 1,
            'description_original' => '工业缝纫机',
            'description_english' => 'One needle sewing machine',
            'hs_code' => '8452.29.00',
            'unit_of_measure' => 'SET',
            'approved_quantity' => 100.000,
            'consumed_quantity' => 0.000,
            'remaining_quantity' => 100.000,
            'unit_price_usd' => 350.00,
            'total_price_usd' => 35000.00,
        ]);

        // 2. Create ASYCUDA Customs Declaration for import
        $declResponse = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations", [
            'declaration_number' => 'SAD-KHKAS-2026-004821',
            'shipment_id' => $this->shipmentA->id,
            'cdc_master_list_id' => $cdcList->id,
            'declaration_date' => '2026-10-20',
            'declaration_type' => 'import',
            'customs_office_code' => 'KHKAS',
            'regime_code' => 'IM 4',
            'inspection_lane' => 'green',
            'declarant_partner_id' => $this->brokerA->id,
            'consignee_partner_id' => $this->customerA->id,
            'invoice_number' => '26TKYM164',
            'bill_of_lading_number' => 'BL-YS26100022-1',
            'total_packages' => 10,
            'items' => [
                [
                    'item_number' => 1,
                    'hs_code' => '8452.29.00',
                    'description' => 'Industrial Sewing Machine Model X',
                    'quantity' => 10,
                    'unit_of_measure' => 'SET',
                    'gross_weight_kg' => 450.00,
                    'net_weight_kg' => 400.00,
                    'customs_value_usd' => 3500.00,
                    'duty_rate_percent' => 7.00,
                    'is_duty_exempt' => true,
                ],
            ],
        ]);

        $declResponse->assertStatus(201)
            ->assertJsonPath('data.declaration_number', 'SAD-KHKAS-2026-004821');

        $declarationId = $declResponse->json('data.id');
        $declarationItemId = $declResponse->json('data.items.0.id');

        // 3. Deduct CDC Quota (10 sets against the 100 sets approved)
        $deductResponse = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations/{$declarationId}/deduct-quota", [
            'deductions' => [
                [
                    'declaration_item_id' => $declarationItemId,
                    'cdc_master_item_id' => $itemSewing->id,
                    'quantity' => 10.000,
                    'notes' => 'Import deduction for invoice 26TKYM164',
                ],
            ],
        ]);

        $deductResponse->assertStatus(200)
            ->assertJsonPath('deductions_count', 1);

        // Verify remaining quota reduced to 90
        $this->assertEquals(10.000, (float) $itemSewing->fresh()->consumed_quantity);
        $this->assertEquals(90.000, (float) $itemSewing->fresh()->remaining_quantity);

        // Verify deduction ledger row created
        $this->assertDatabaseHas('cdc_quota_deductions', [
            'organization_id' => $this->orgA->id,
            'cdc_master_item_id' => $itemSewing->id,
            'customs_declaration_id' => $declarationId,
            'deducted_quantity' => 10.000,
            'balance_before' => 100.000,
            'balance_after' => 90.000,
        ]);
    }

    public function test_quota_deduction_fails_if_requested_quantity_exceeds_remaining_balance(): void
    {
        $cdcList = $this->orgA->cdcMasterLists()->create([
            'qip_number' => 'QIP # 211-26',
            'company_name' => 'XIN CAI FU LTD',
            'approval_reference' => 'CDC-REF-1',
            'effective_year' => 2026,
        ]);

        $item = $cdcList->items()->create([
            'organization_id' => $this->orgA->id,
            'category' => 'machinery',
            'item_number' => 1,
            'description_english' => 'One needle sewing machine',
            'hs_code' => '8452.29.00',
            'approved_quantity' => 10.000,
            'consumed_quantity' => 0.000,
            'remaining_quantity' => 10.000,
        ]);

        $decl = $this->orgA->customsDeclarations()->create([
            'declaration_number' => 'SAD-OVERQUOTA',
            'declaration_date' => '2026-10-20',
            'cdc_master_list_id' => $cdcList->id,
            'status' => 'draft',
        ]);

        $declItem = $decl->items()->create([
            'organization_id' => $this->orgA->id,
            'item_number' => 1,
            'hs_code' => '8452.29.00',
            'description' => 'Industrial Sewing Machine',
            'quantity' => 25.000,
        ]);

        // Attempt to deduct 25 from remaining 10
        $response = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations/{$decl->id}/deduct-quota", [
            'deductions' => [
                [
                    'declaration_item_id' => $declItem->id,
                    'cdc_master_item_id' => $item->id,
                    'quantity' => 25.000,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        // Verify remaining balance remains untouched
        $this->assertEquals(10.000, (float) $item->fresh()->remaining_quantity);
    }

    public function test_transition_customs_declaration_status_to_cleared_updates_shipment_customs_status_and_emits_milestone(): void
    {
        $declaration = $this->orgA->customsDeclarations()->create([
            'declaration_number' => 'SAD-CLEARED-TEST',
            'shipment_id' => $this->shipmentA->id,
            'declaration_date' => '2026-10-20',
            'status' => 'lodged',
            'inspection_lane' => 'green',
        ]);

        $response = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations/{$declaration->id}/transition", [
            'status' => 'cleared',
            'inspection_lane' => 'green',
            'notes' => 'Passed documentary and customs duty exemption audit without delay.',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cleared');

        // Verify parent shipment customs_status was automatically updated to cleared
        $this->assertEquals('cleared', $this->shipmentA->fresh()->customs_status);

        // Verify automated shipment milestone was logged
        $this->assertDatabaseHas('shipment_milestones', [
            'organization_id' => $this->orgA->id,
            'shipment_id' => $this->shipmentA->id,
            'code' => 'CUSTOMS_CLEARED',
        ]);
    }

    public function test_adversarial_cross_tenant_isolation_returns_404(): void
    {
        $cdcListA = $this->orgA->cdcMasterLists()->create([
            'qip_number' => 'QIP-SECRET-A',
            'company_name' => 'SECRET ORG A',
            'approval_reference' => 'CDC-A',
            'effective_year' => 2026,
        ]);

        $declA = $this->orgA->customsDeclarations()->create([
            'declaration_number' => 'SAD-SECRET-A',
            'declaration_date' => '2026-10-20',
            'status' => 'draft',
        ]);

        // Tenant B attempts to read Tenant A's CDC list
        $this->actingAs($this->ownerB)->getJson("/api/v1/organizations/{$this->orgB->id}/customs/cdc-master-lists/{$cdcListA->id}")
            ->assertStatus(404);

        // Tenant B attempts to read Tenant A's declaration
        $this->actingAs($this->ownerB)->getJson("/api/v1/organizations/{$this->orgB->id}/customs/declarations/{$declA->id}")
            ->assertStatus(404);

        // Tenant B attempts to transition Tenant A's declaration
        $this->actingAs($this->ownerB)->postJson("/api/v1/organizations/{$this->orgB->id}/customs/declarations/{$declA->id}/transition", [
            'status' => 'cleared',
        ])->assertStatus(404);

        // Tenant B attempts to delete Tenant A's declaration
        $this->actingAs($this->ownerB)->deleteJson("/api/v1/organizations/{$this->orgB->id}/customs/declarations/{$declA->id}")
            ->assertStatus(404);
    }

    public function test_viewer_role_cannot_create_declaration_or_deduct_quota(): void
    {
        // Viewer attempt to create declaration should fail with 403
        $this->actingAs($this->viewerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations", [
            'declaration_number' => 'SAD-VIEWER-ATTEMPT',
            'declaration_date' => '2026-10-20',
        ])->assertStatus(403);

        $declA = $this->orgA->customsDeclarations()->create([
            'declaration_number' => 'SAD-VIEWER-READ',
            'declaration_date' => '2026-10-20',
            'status' => 'draft',
        ]);

        // Viewer attempt to transition status should fail with 403
        $this->actingAs($this->viewerA)->postJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations/{$declA->id}/transition", [
            'status' => 'cleared',
        ])->assertStatus(403);

        // But Viewer CAN view declarations and catalog
        $this->actingAs($this->viewerA)->getJson("/api/v1/organizations/{$this->orgA->id}/customs/declarations/{$declA->id}")
            ->assertStatus(200);

        $this->actingAs($this->viewerA)->getJson("/api/v1/organizations/{$this->orgA->id}/customs/catalog")
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'stats',
                    'customs_offices',
                    'regimes',
                    'inspection_lanes',
                    'declaration_statuses',
                ],
            ]);
    }
}
