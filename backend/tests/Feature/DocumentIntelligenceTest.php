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

class DocumentIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    private User $ownerA;

    private User $ownerB;

    private User $viewerA;

    private Organization $orgA;

    private Organization $orgB;

    private BusinessPartner $customerA;

    private Location $originA;

    private Location $destA;

    private Shipment $shipmentA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);

        $actions = app(OrganizationActions::class);

        // Tenant A
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
            'name' => 'Xin Cai Fu Garments Ltd',
            'roles' => ['customer', 'consignee'],
            'country_code' => 'KH',
        ]);

        $this->originA = $this->orgA->locations()->create([
            'business_partner_id' => $this->customerA->id,
            'name' => 'Shanghai Port Terminal',
            'type' => 'port',
            'address_line_1' => 'Yangshan Deepwater Port',
            'country_code' => 'CN',
            'city' => 'Shanghai',
        ]);

        $this->destA = $this->orgA->locations()->create([
            'business_partner_id' => $this->customerA->id,
            'name' => 'Phnom Penh SEZ Factory',
            'type' => 'warehouse',
            'address_line_1' => 'National Road 4, PPSEZ',
            'country_code' => 'KH',
            'city' => 'Phnom Penh',
        ]);

        $this->shipmentA = $this->orgA->shipments()->create([
            'shipment_number' => 'SHP-2026-XCF1',
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'ocean_fcl',
            'status' => 'planned',
        ]);
    }

    public function test_user_can_upload_and_parse_trade_document_with_chinese_descriptions(): void
    {
        $csvContent = implode("\n", [
            'INVOICE NO: 26TKYM164, DATE: 2026-10-15',
            'CONSIGNEE: Xin Cai Fu Garments Ltd',
            'SUPPLIER: Ningbo Garment Machinery Ltd',
            'H.S.Code,Description,English,Quantity,Unit,Unit Price,Total Amount',
            '8452.29.00,工业缝纫机,Industrial Sewing Machine,10,SET,350.00,3500.00',
            '7326.90.90,堆垛架,,20,PCS,85.00,1700.00',
            '9607.11.00,金属拉链,,5000,METER,0.45,2250.00',
        ]);

        $response = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents", [
            'document_type' => 'commercial_invoice',
            'document_number' => '26TKYM164',
            'shipment_id' => $this->shipmentA->id,
            'file_name' => '清关---TK164拓卡-新彩福-柬埔寨资料.csv',
            'raw_content' => $csvContent,
            'language' => 'zh-CN,en',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('document_number', '26TKYM164')
            ->assertJsonPath('status', 'parsed');

        $docId = $response->json('id');
        $this->assertDatabaseHas('trade_documents', [
            'id' => $docId,
            'organization_id' => $this->orgA->id,
            'shipment_id' => $this->shipmentA->id,
            'document_number' => '26TKYM164',
        ]);

        // Verify line items and automated Chinese -> English translation
        $this->assertDatabaseHas('trade_document_items', [
            'trade_document_id' => $docId,
            'organization_id' => $this->orgA->id,
            'description_original' => '工业缝纫机',
            'description_english' => 'Industrial Sewing Machine',
            'quantity' => 10,
            'total_amount' => 3500.00,
        ]);

        $this->assertDatabaseHas('trade_document_items', [
            'trade_document_id' => $docId,
            'organization_id' => $this->orgA->id,
            'description_original' => '堆垛架',
            'description_english' => 'Stacking Rack',
            'quantity' => 20,
        ]);

        $this->assertDatabaseHas('trade_document_items', [
            'trade_document_id' => $docId,
            'organization_id' => $this->orgA->id,
            'description_original' => '金属拉链',
            'description_english' => 'Metal Zipper',
            'quantity' => 5000,
        ]);
    }

    public function test_user_can_cross_reconcile_invoice_against_packing_list_and_detect_discrepancies(): void
    {
        // 1. Create Invoice Document
        $invoice = $this->orgA->tradeDocuments()->create([
            'document_number' => 'INV-26TKYM164',
            'document_type' => 'commercial_invoice',
            'file_name' => 'Invoice_TK164.csv',
            'shipment_id' => $this->shipmentA->id,
            'status' => 'parsed',
            'extracted_metadata' => [
                'invoice_no' => 'INV-26TKYM164',
                'supplier' => 'Ningbo Garment Machinery Ltd',
                'consignee' => 'Xin Cai Fu Garments Ltd',
            ],
        ]);

        $invoice->items()->createMany([
            [
                'organization_id' => $this->orgA->id,
                'line_number' => 1,
                'hs_code' => '8452.29.00',
                'description_original' => '工业缝纫机',
                'description_english' => 'Industrial Sewing Machine',
                'quantity' => 10,
                'unit_of_measure' => 'SET',
                'unit_price' => 350.00,
                'total_amount' => 3500.00,
            ],
            [
                'organization_id' => $this->orgA->id,
                'line_number' => 2,
                'hs_code' => '7326.90.90',
                'description_original' => '堆垛架',
                'description_english' => 'Stacking Rack',
                'quantity' => 20,
                'unit_of_measure' => 'PCS',
                'unit_price' => 85.00,
                'total_amount' => 1700.00,
            ],
        ]);

        // 2. Create Packing List Document (with variance on Stacking Rack quantity)
        $packing = $this->orgA->tradeDocuments()->create([
            'document_number' => 'PL-26TKYM164',
            'document_type' => 'packing_list',
            'file_name' => 'Packing_TK164.csv',
            'shipment_id' => $this->shipmentA->id,
            'status' => 'parsed',
            'extracted_metadata' => [
                'contract_no' => 'INV-26TKYM164',
                'supplier' => 'Ningbo Garment Machinery Ltd',
                'consignee' => 'Xin Cai Fu Garments Ltd',
            ],
        ]);

        $packing->items()->createMany([
            [
                'organization_id' => $this->orgA->id,
                'line_number' => 1,
                'hs_code' => '8452.29.00',
                'description_original' => '工业缝纫机',
                'description_english' => 'Industrial Sewing Machine',
                'quantity' => 10,
                'unit_of_measure' => 'SET',
                'package_count' => 10,
                'package_type' => 'crates',
                'gross_weight_kg' => 450.00,
                'net_weight_kg' => 400.00,
                'volume_cbm' => 2.5,
            ],
            [
                'organization_id' => $this->orgA->id,
                'line_number' => 2,
                'hs_code' => '7326.90.90',
                'description_original' => '堆垛架',
                'description_english' => 'Stacking Rack',
                'quantity' => 18, // Discrepancy: 18 vs 20!
                'unit_of_measure' => 'PCS',
                'package_count' => 5,
                'package_type' => 'bundles',
                'gross_weight_kg' => 220.00,
                'net_weight_kg' => 210.00,
                'volume_cbm' => 1.8,
            ],
        ]);

        // 3. Trigger Cross-Reconciliation
        $response = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents/reconciliations", [
            'invoice_document_id' => $invoice->id,
            'packing_list_document_id' => $packing->id,
            'shipment_id' => $this->shipmentA->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'has_discrepancies')
            ->assertJsonPath('total_invoice_items', 2)
            ->assertJsonPath('total_packing_items', 2)
            ->assertJsonPath('invoice_total_quantity', '30.000')
            ->assertJsonPath('packing_total_quantity', '28.000');

        $reconciliationId = $response->json('id');
        $this->assertDatabaseHas('document_reconciliations', [
            'id' => $reconciliationId,
            'organization_id' => $this->orgA->id,
            'status' => 'has_discrepancies',
        ]);

        // Verify document statuses updated to flagged
        $this->assertEquals('flagged', $invoice->fresh()->status);
        $this->assertEquals('flagged', $packing->fresh()->status);

        // Verify user can resolve the reconciliation
        $resolveResp = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents/reconciliations/{$reconciliationId}/resolve", [
            'notes' => 'Short shipment of 2 stacking racks acknowledged and accepted by consignee.',
        ]);

        $resolveResp->assertStatus(200)
            ->assertJsonPath('status', 'resolved');

        $this->assertDatabaseHas('document_reconciliations', [
            'id' => $reconciliationId,
            'status' => 'resolved',
        ]);
    }

    public function test_user_can_push_verified_document_items_to_shipment_cargo_manifest(): void
    {
        $document = $this->orgA->tradeDocuments()->create([
            'document_number' => 'INV-CONFIRMED',
            'document_type' => 'commercial_invoice',
            'file_name' => 'Approved_Cargo.csv',
            'shipment_id' => $this->shipmentA->id,
            'status' => 'parsed',
        ]);

        $item1 = $document->items()->create([
            'organization_id' => $this->orgA->id,
            'line_number' => 1,
            'hs_code' => '8452.29.00',
            'description_original' => '工业缝纫机',
            'description_english' => 'Industrial Sewing Machine Model X',
            'quantity' => 5,
            'unit_of_measure' => 'SET',
            'gross_weight_kg' => 250.00,
            'volume_cbm' => 1.5,
        ]);

        $item2 = $document->items()->create([
            'organization_id' => $this->orgA->id,
            'line_number' => 2,
            'hs_code' => '7326.90.90',
            'description_original' => '周转车',
            'description_english' => 'Material Handling Trolley',
            'quantity' => 12,
            'unit_of_measure' => 'PCS',
            'gross_weight_kg' => 180.00,
            'volume_cbm' => 2.2,
        ]);

        // Verify document
        $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents/{$document->id}/verify")
            ->assertStatus(200)
            ->assertJsonPath('status', 'verified');

        // 1-Click Sync: Push to Shipment Cargo Manifest
        $response = $this->actingAs($this->ownerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents/{$document->id}/push-to-cargo", [
            'shipment_id' => $this->shipmentA->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('created_count', 2);

        $this->assertDatabaseHas('cargo_items', [
            'organization_id' => $this->orgA->id,
            'shipment_id' => $this->shipmentA->id,
            'description' => 'Industrial Sewing Machine Model X',
            'commodity' => '工业缝纫机',
            'hs_code' => '8452.29.00',
            'quantity' => 5,
            'gross_weight_kg' => 250.00,
        ]);

        $this->assertDatabaseHas('cargo_items', [
            'organization_id' => $this->orgA->id,
            'shipment_id' => $this->shipmentA->id,
            'description' => 'Material Handling Trolley',
            'commodity' => '周转车',
            'hs_code' => '7326.90.90',
            'quantity' => 12,
            'gross_weight_kg' => 180.00,
        ]);
    }

    public function test_adversarial_cross_tenant_isolation_returns_404(): void
    {
        $docA = $this->orgA->tradeDocuments()->create([
            'document_number' => 'DOC-SECRET-A',
            'file_name' => 'secret_a.csv',
            'status' => 'parsed',
        ]);

        // Tenant B attempts to read Tenant A's document
        $this->actingAs($this->ownerB)->getJson("/api/v1/organizations/{$this->orgB->id}/documents/{$docA->id}")
            ->assertStatus(404);

        // Tenant B attempts to delete Tenant A's document
        $this->actingAs($this->ownerB)->deleteJson("/api/v1/organizations/{$this->orgB->id}/documents/{$docA->id}")
            ->assertStatus(404);

        // Tenant B attempts to push Tenant A's document into Tenant B's shipment
        $shipmentB = $this->orgB->shipments()->create([
            'shipment_number' => 'SHP-B-1',
            'customer_id' => $this->orgB->partners()->create(['name' => 'Customer B', 'roles' => ['customer'], 'country_code' => 'VN'])->id,
            'origin_location_id' => $this->orgB->locations()->create(['name' => 'Loc B1', 'type' => 'port', 'address_line_1' => 'Port Rd', 'country_code' => 'VN', 'city' => 'HCMC'])->id,
            'destination_location_id' => $this->orgB->locations()->create(['name' => 'Loc B2', 'type' => 'warehouse', 'address_line_1' => 'Whse Rd', 'country_code' => 'VN', 'city' => 'Hanoi'])->id,
            'transport_mode' => 'road',
        ]);

        $this->actingAs($this->ownerB)->postJson("/api/v1/organizations/{$this->orgB->id}/documents/{$docA->id}/push-to-cargo", [
            'shipment_id' => $shipmentB->id,
        ])->assertStatus(404);
    }

    public function test_viewer_role_cannot_upload_or_verify_documents(): void
    {
        $this->actingAs($this->viewerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents", [
            'document_type' => 'commercial_invoice',
            'file_name' => 'test.csv',
        ])->assertStatus(403);

        $docA = $this->orgA->tradeDocuments()->create([
            'document_number' => 'DOC-VIEW-TEST',
            'file_name' => 'test.csv',
            'status' => 'parsed',
        ]);

        $this->actingAs($this->viewerA)->postJson("/api/v1/organizations/{$this->orgA->id}/documents/{$docA->id}/verify")
            ->assertStatus(403);

        // But Viewer CAN read documents
        $this->actingAs($this->viewerA)->getJson("/api/v1/organizations/{$this->orgA->id}/documents/{$docA->id}")
            ->assertStatus(200);
    }

    public function test_catalog_returns_expected_data_envelope_and_stats(): void
    {
        $this->orgA->tradeDocuments()->create([
            'document_number' => 'DOC-CATALOG-1',
            'file_name' => 'cat1.csv',
            'status' => 'verified',
        ]);

        $response = $this->actingAs($this->ownerA)->getJson("/api/v1/organizations/{$this->orgA->id}/documents/catalog");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'shipments',
                    'stats' => [
                        'total_documents',
                        'reconciled',
                        'flagged',
                        'verified',
                        'total_reconciliations',
                        'unresolved_reconciliations',
                    ],
                    'document_types',
                ],
            ])
            ->assertJsonPath('data.stats.total_documents', 1)
            ->assertJsonPath('data.stats.verified', 1);
    }
}
