<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Freight\Booking;
use App\Modules\Freight\FreightRequest;
use App\Modules\Freight\Quotation;
use App\Modules\Freight\Shipment;
use App\Modules\Locations\Location;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Partners\BusinessPartner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FreightManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $ownerA;
    private User $ownerB;
    private Organization $orgA;
    private Organization $orgB;
    private BusinessPartner $customerA;
    private BusinessPartner $carrierA;
    private Location $originA;
    private Location $destA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);

        $actions = app(OrganizationActions::class);

        // Tenant A
        $this->ownerA = User::factory()->create();
        $this->orgA = $actions->create($this->ownerA, [
            'name' => 'Mekong Forwarding',
            'country_code' => 'KH',
            'currency' => 'USD',
            'timezone' => 'Asia/Phnom_Penh',
            'activities' => ['freight_forwarding', 'road_transport'],
        ]);

        // Tenant B
        $this->ownerB = User::factory()->create();
        $this->orgB = $actions->create($this->ownerB, [
            'name' => 'Competitor Logistics',
            'country_code' => 'VN',
            'currency' => 'USD',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'activities' => ['freight_forwarding'],
        ]);

        // Tenant A Fixtures
        $this->customerA = $this->orgA->partners()->create([
            'name' => 'Angkor Garments Ltd',
            'roles' => ['customer', 'shipper'],
            'country_code' => 'KH',
        ]);
        $this->carrierA = $this->orgA->partners()->create([
            'name' => 'Phnom Penh Trucking Co',
            'roles' => ['carrier'],
            'country_code' => 'KH',
        ]);
        $this->originA = $this->orgA->locations()->create([
            'name' => 'Factory Warehouse',
            'type' => 'warehouse',
            'address_line_1' => 'Veng Sreng Blvd',
            'city' => 'Phnom Penh',
            'country_code' => 'KH',
        ]);
        $this->destA = $this->orgA->locations()->create([
            'name' => 'Sihanoukville Port Terminal',
            'type' => 'port',
            'address_line_1' => 'Autonomous Port',
            'city' => 'Sihanoukville',
            'country_code' => 'KH',
        ]);
    }

    private function url(Organization $org, string $path): string
    {
        return "/api/v1/organizations/{$org->id}/freight/{$path}";
    }

    public function test_freight_catalog_endpoint(): void
    {
        $this->actingAs($this->ownerA);
        $res = $this->getJson($this->url($this->orgA, 'catalog'))
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'transport_modes',
                    'incoterms',
                    'package_types',
                    'charge_types',
                    'leg_types',
                    'operational_statuses',
                    'customs_statuses',
                    'milestone_presets',
                ],
            ]);

        $this->assertContains('FOB', $res->json('data.incoterms'));
        $this->assertContains('road', array_column($res->json('data.transport_modes'), 'value'));
    }

    public function test_freight_request_lifecycle(): void
    {
        $this->actingAs($this->ownerA);

        $payload = [
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
            'incoterm' => 'FOB',
            'cargo_description' => '500 cartons of cotton apparel',
            'package_type' => 'cartons',
            'total_pieces' => 500,
            'total_weight_kg' => 4500,
            'total_volume_cbm' => 18.5,
        ];

        // Create
        $res = $this->postJson($this->url($this->orgA, 'requests'), $payload)
            ->assertCreated()
            ->assertJsonPath('data.customer_id', $this->customerA->id)
            ->assertJsonPath('data.status', 'draft');

        $reqId = $res->json('data.id');
        $this->assertStringStartsWith('REQ-', $res->json('data.request_number'));

        // Update
        $this->patchJson($this->url($this->orgA, "requests/{$reqId}"), [
            'status' => 'submitted',
            'notes' => 'Priority export cargo',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.notes', 'Priority export cargo');

        // Audit check
        $this->assertDatabaseHas('audit_events', [
            'organization_id' => $this->orgA->id,
            'action' => 'freight_request.created',
        ]);
    }

    public function test_quotation_line_items_revision_and_status(): void
    {
        $this->actingAs($this->ownerA);

        $payload = [
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
            'incoterm' => 'FOB',
            'currency' => 'USD',
            'line_items' => [
                ['description' => 'Road freight Phnom Penh to Sihanoukville', 'charge_type' => 'freight', 'quantity' => 1, 'unit_price' => 450],
                ['description' => 'Port gate processing fee', 'charge_type' => 'origin_handling', 'quantity' => 1, 'unit_price' => 50],
            ],
        ];

        $res = $this->postJson($this->url($this->orgA, 'quotations'), $payload)
            ->assertCreated()
            ->assertJsonPath('data.revision', 0)
            ->assertJsonPath('data.total_amount', '500.00');

        $quoId = $res->json('data.id');
        $quoNumber = $res->json('data.quotation_number');

        // Revise quotation (R1)
        $revisePayload = [
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
            'line_items' => [
                ['description' => 'Discounted Road freight', 'charge_type' => 'freight', 'quantity' => 1, 'unit_price' => 420],
                ['description' => 'Port gate processing fee', 'charge_type' => 'origin_handling', 'quantity' => 1, 'unit_price' => 50],
            ],
        ];

        $revRes = $this->postJson($this->url($this->orgA, "quotations/{$quoId}/revise"), $revisePayload)
            ->assertCreated()
            ->assertJsonPath('data.quotation_number', $quoNumber)
            ->assertJsonPath('data.revision', 1)
            ->assertJsonPath('data.total_amount', '470.00');

        $revId = $revRes->json('data.id');

        // Status transition to accepted
        $this->postJson($this->url($this->orgA, "quotations/{$revId}/status"), ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');
    }

    public function test_booking_and_shipment_with_multimodal_legs_and_milestones(): void
    {
        $this->actingAs($this->ownerA);

        // 1. Create Booking
        $bookRes = $this->postJson($this->url($this->orgA, 'bookings'), [
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'multimodal',
            'customer_reference' => 'PO-2026-889',
            'cargo_items' => [
                ['description' => 'Knitted Shirts', 'package_type' => 'cartons', 'quantity' => 200, 'gross_weight_kg' => 1500, 'volume_cbm' => 6.2],
            ],
        ])->assertCreated()->assertJsonPath('data.status', 'draft');

        $bookingId = $bookRes->json('data.id');

        // 2. Create Shipment linked to booking with multimodal legs & participants
        $shipRes = $this->postJson($this->url($this->orgA, 'shipments'), [
            'booking_id' => $bookingId,
            'customer_id' => $this->customerA->id,
            'carrier_id' => $this->carrierA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'multimodal',
            'master_tracking_number' => 'MK-EXP-2026-001',
            'legs' => [
                [
                    'leg_type' => 'pre_carriage',
                    'transport_mode' => 'road',
                    'origin_location_id' => $this->originA->id,
                    'destination_location_id' => $this->destA->id,
                    'carrier_id' => $this->carrierA->id,
                    'vessel_or_flight_or_plate' => '3C-8899',
                ],
            ],
            'participants' => [
                ['business_partner_id' => $this->customerA->id, 'role' => 'shipper'],
                ['business_partner_id' => $this->carrierA->id, 'role' => 'carrier'],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.customs_status', 'not_applicable');

        $shipId = $shipRes->json('data.id');
        $this->assertCount(1, $shipRes->json('data.legs'));
        $this->assertCount(2, $shipRes->json('data.participants'));
        $this->assertCount(1, $shipRes->json('data.milestones')); // initial milestone

        // 3. Add operational milestone (dispatched)
        $this->postJson($this->url($this->orgA, "shipments/{$shipId}/milestones"), [
            'code' => 'DISPATCHED',
            'title' => 'Truck Departed Factory',
            'occurred_at' => now()->toIso8601String(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'DISPATCHED');

        $this->getJson($this->url($this->orgA, "shipments/{$shipId}"))
            ->assertOk()
            ->assertJsonPath('data.status', 'dispatched');

        // 4. Add customs milestone (customs cleared decoupled from in_transit)
        $this->postJson($this->url($this->orgA, "shipments/{$shipId}/milestones"), [
            'code' => 'CUSTOMS_CLEARED',
            'title' => 'ASYCUDA Declaration Cleared at Port',
            'occurred_at' => now()->toIso8601String(),
        ])->assertCreated();

        $this->getJson($this->url($this->orgA, "shipments/{$shipId}"))
            ->assertOk()
            ->assertJsonPath('data.status', 'dispatched') // remains in dispatched/transit
            ->assertJsonPath('data.customs_status', 'cleared'); // customs advanced independently!

        // 5. Add cargo item
        $cargoRes = $this->postJson($this->url($this->orgA, "shipments/{$shipId}/cargo-items"), [
            'description' => 'Denim Jackets',
            'package_type' => 'cartons',
            'quantity' => 150,
            'gross_weight_kg' => 900,
            'volume_cbm' => 4.1,
        ])->assertCreated()->assertJsonPath('data.description', 'Denim Jackets');

        $cargoId = $cargoRes->json('data.id');

        // Delete cargo item
        $this->deleteJson($this->url($this->orgA, "shipments/{$shipId}/cargo-items/{$cargoId}"))
            ->assertOk();
    }

    public function test_adversarial_cross_tenant_isolation(): void
    {
        // 1. Tenant A creates a shipment
        $this->actingAs($this->ownerA);
        $shipRes = $this->postJson($this->url($this->orgA, 'shipments'), [
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
        ])->assertCreated();

        $shipmentAId = $shipRes->json('data.id');

        // 2. Switch to Tenant B
        $this->actingAs($this->ownerB);

        // Adversarial check A: Tenant B attempts to read Tenant A's shipment via Tenant A URL -> 404 (no membership)
        $this->getJson($this->url($this->orgA, "shipments/{$shipmentAId}"))
            ->assertNotFound();

        // Adversarial check B: Tenant B attempts to access Tenant A's shipment via Tenant B URL -> 404 (scoped to Tenant B)
        $this->getJson($this->url($this->orgB, "shipments/{$shipmentAId}"))
            ->assertNotFound();

        // Adversarial check C: Tenant B attempts to create a shipment in Tenant B referencing Tenant A's customer -> 404
        $this->postJson($this->url($this->orgB, 'shipments'), [
            'customer_id' => $this->customerA->id, // belongs to Tenant A!
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
        ])->assertNotFound();

        // Adversarial check D: Tenant B attempts to add milestone to Tenant A's shipment -> 404
        $this->postJson($this->url($this->orgB, "shipments/{$shipmentAId}/milestones"), [
            'code' => 'DELIVERED',
            'title' => 'Malicious Milestone',
        ])->assertNotFound();
    }

    public function test_rbac_viewer_is_read_only(): void
    {
        // Add a Viewer user to Tenant A
        $viewer = User::factory()->create();
        $this->orgA->memberships()->create([
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        $this->actingAs($viewer);

        // Viewer CAN read catalog & list
        $this->getJson($this->url($this->orgA, 'catalog'))->assertOk();
        $this->getJson($this->url($this->orgA, 'shipments'))->assertOk();

        // Viewer CANNOT create
        $this->postJson($this->url($this->orgA, 'shipments'), [
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
        ])->assertForbidden();
    }
}
