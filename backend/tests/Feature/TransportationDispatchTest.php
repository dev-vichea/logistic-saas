<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Freight\Shipment;
use App\Modules\Locations\Location;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Partners\BusinessPartner;
use App\Modules\Transportation\Driver;
use App\Modules\Transportation\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportationDispatchTest extends TestCase
{
    use RefreshDatabase;

    private User $ownerA;

    private User $ownerB;

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
            'name' => 'Mekong Transport Co.',
            'country_code' => 'KH',
            'currency' => 'USD',
            'timezone' => 'Asia/Phnom_Penh',
            'activities' => ['road_transport', 'freight_forwarding'],
        ]);

        // Tenant B
        $this->ownerB = User::factory()->create();
        $this->orgB = $actions->create($this->ownerB, [
            'name' => 'Competitor Trucking',
            'country_code' => 'TH',
            'currency' => 'USD',
            'timezone' => 'Asia/Bangkok',
            'activities' => ['road_transport'],
        ]);

        // Tenant A Locations & Partner
        $this->customerA = $this->orgA->partners()->create([
            'name' => 'Sovann Garments Ltd',
            'roles' => ['customer', 'shipper'],
            'country_code' => 'KH',
        ]);

        $this->originA = $this->orgA->locations()->create([
            'business_partner_id' => $this->customerA->id,
            'name' => 'Phnom Penh Factory #1',
            'type' => 'warehouse',
            'address_line_1' => 'Veng Sreng Blvd',
            'city' => 'Phnom Penh',
            'country_code' => 'KH',
        ]);

        $this->destA = $this->orgA->locations()->create([
            'business_partner_id' => $this->customerA->id,
            'name' => 'Bavet Border Terminal',
            'type' => 'port',
            'address_line_1' => 'National Road 1',
            'city' => 'Bavet',
            'country_code' => 'KH',
        ]);

        // Operational Shipment with a road leg
        $this->shipmentA = $this->orgA->shipments()->create([
            'shipment_number' => 'SHP-TEST-0001',
            'customer_id' => $this->customerA->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'transport_mode' => 'road',
            'status' => 'planned',
        ]);

        $this->shipmentA->legs()->create([
            'organization_id' => $this->orgA->id,
            'sequence' => 1,
            'leg_type' => 'pre_carriage',
            'transport_mode' => 'road',
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'status' => 'scheduled',
        ]);
    }

    private function url(Organization $org, string $path): string
    {
        return "/api/v1/organizations/{$org->id}/transport/{$path}";
    }

    public function test_can_manage_fleet_vehicles_and_drivers(): void
    {
        $this->actingAs($this->ownerA);

        // Read catalog
        $catRes = $this->getJson($this->url($this->orgA, 'catalog'))->assertOk();
        $this->assertArrayHasKey('vehicle_types', $catRes->json('data'));
        $this->assertArrayHasKey('driver_license_types', $catRes->json('data'));

        // Create Vehicle
        $vRes = $this->postJson($this->url($this->orgA, 'vehicles'), [
            'plate_number' => '3A-9988',
            'type' => 'rigid_truck',
            'ownership_type' => 'owned',
            'make_model' => 'Hino 500 15T',
            'max_payload_kg' => 15000,
            'volume_capacity_cbm' => 45.0,
        ])->assertCreated();

        $vehicleId = $vRes->json('data.id');
        $this->assertDatabaseHas('vehicles', ['id' => $vehicleId, 'organization_id' => $this->orgA->id, 'plate_number' => '3A-9988']);

        // Update Vehicle
        $this->patchJson($this->url($this->orgA, "vehicles/{$vehicleId}"), [
            'current_status' => 'maintenance',
        ])->assertOk();
        $this->assertDatabaseHas('vehicles', ['id' => $vehicleId, 'current_status' => 'maintenance']);

        // Create Driver
        $dRes = $this->postJson($this->url($this->orgA, 'drivers'), [
            'full_name' => 'Sokha Meng',
            'phone' => '+855 12 334 556',
            'license_number' => 'DL-KH-889921',
            'license_type' => 'heavy_truck',
        ])->assertCreated();

        $driverId = $dRes->json('data.id');
        $this->assertDatabaseHas('drivers', ['id' => $driverId, 'organization_id' => $this->orgA->id, 'license_number' => 'DL-KH-889921']);
    }

    public function test_can_create_and_dispatch_trip(): void
    {
        $this->actingAs($this->ownerA);

        $vehicle = $this->orgA->vehicles()->create([
            'plate_number' => 'PP-3D-5566',
            'type' => 'tractor_head',
            'make_model' => 'Scania G410',
            'max_payload_kg' => 30000,
        ]);

        $driver = $this->orgA->drivers()->create([
            'full_name' => 'Bunthorn Chea',
            'phone' => '+855 17 889 001',
            'license_number' => 'DL-KH-112233',
        ]);

        $leg = $this->shipmentA->legs()->first();

        // Create Trip
        $tripRes = $this->postJson($this->url($this->orgA, 'trips'), [
            'vehicle_id' => $vehicle->id,
            'driver_id' => $driver->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'container_number' => 'MSCU9988221',
            'seal_number' => 'SL-88712',
            'shipment_leg_ids' => [$leg->id],
        ])->assertCreated();

        $tripId = $tripRes->json('data.id');
        $this->assertDatabaseHas('dispatch_trips', ['id' => $tripId, 'status' => 'draft']);
        $this->assertDatabaseHas('dispatch_trip_legs', ['dispatch_trip_id' => $tripId, 'shipment_leg_id' => $leg->id]);

        // Dispatch Trip
        $this->postJson($this->url($this->orgA, "trips/{$tripId}/dispatch"), [
            'odometer_start_km' => 124500.5,
        ])->assertOk();

        // Assert Trip updated
        $this->assertDatabaseHas('dispatch_trips', [
            'id' => $tripId,
            'status' => 'in_transit',
            'odometer_start_km' => 124500.5,
        ]);

        // Assert vehicle and driver statuses updated
        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'current_status' => 'dispatched']);
        $this->assertDatabaseHas('drivers', ['id' => $driver->id, 'current_status' => 'on_trip']);

        // Assert leg and shipment advanced to in_transit
        $this->assertDatabaseHas('shipment_legs', ['id' => $leg->id, 'status' => 'in_transit', 'vessel_or_flight_or_plate' => 'PP-3D-5566']);
        $this->assertDatabaseHas('shipments', ['id' => $this->shipmentA->id, 'status' => 'in_transit']);

        // Assert automated milestone created
        $this->assertDatabaseHas('shipment_milestones', [
            'shipment_id' => $this->shipmentA->id,
            'code' => 'DEPARTED',
        ]);
    }

    public function test_can_record_proof_of_delivery(): void
    {
        $this->actingAs($this->ownerA);

        $vehicle = $this->orgA->vehicles()->create([
            'plate_number' => '3B-1122',
            'type' => 'rigid_truck',
            'make_model' => 'Hino 500',
            'max_payload_kg' => 12000,
            'current_status' => 'dispatched',
        ]);

        $driver = $this->orgA->drivers()->create([
            'full_name' => 'Chanthy Ros',
            'phone' => '+855 92 112 334',
            'license_number' => 'DL-KH-556677',
            'current_status' => 'on_trip',
        ]);

        $trip = $this->orgA->dispatchTrips()->create([
            'trip_number' => 'TRP-2026-0099',
            'vehicle_id' => $vehicle->id,
            'driver_id' => $driver->id,
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
            'status' => 'in_transit',
        ]);

        $leg = $this->shipmentA->legs()->first();
        $trip->tripLegs()->create([
            'organization_id' => $this->orgA->id,
            'shipment_leg_id' => $leg->id,
            'sequence' => 1,
        ]);

        // Submit POD
        $podRes = $this->postJson($this->url($this->orgA, "trips/{$trip->id}/pod"), [
            'shipment_id' => $this->shipmentA->id,
            'recipient_name' => 'Vannak Heng (Warehouse Receiving Lead)',
            'received_packages' => 450,
            'damaged_packages' => 0,
            'discrepancy_notes' => 'All cartons intact, seals verified.',
        ])->assertCreated();

        $podId = $podRes->json('data.id');
        $this->assertDatabaseHas('proof_of_deliveries', [
            'id' => $podId,
            'organization_id' => $this->orgA->id,
            'dispatch_trip_id' => $trip->id,
            'shipment_id' => $this->shipmentA->id,
            'recipient_name' => 'Vannak Heng (Warehouse Receiving Lead)',
        ]);

        // Assert shipment is now delivered
        $this->assertDatabaseHas('shipments', ['id' => $this->shipmentA->id, 'status' => 'delivered']);
        // Assert leg is completed
        $this->assertDatabaseHas('shipment_legs', ['id' => $leg->id, 'status' => 'completed']);
        // Assert trip is completed
        $this->assertDatabaseHas('dispatch_trips', ['id' => $trip->id, 'status' => 'completed']);
        // Assert vehicle and driver freed to available
        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'current_status' => 'available']);
        $this->assertDatabaseHas('drivers', ['id' => $driver->id, 'current_status' => 'available']);

        // Assert DELIVERED milestone created
        $this->assertDatabaseHas('shipment_milestones', [
            'shipment_id' => $this->shipmentA->id,
            'code' => 'DELIVERED',
        ]);
    }

    public function test_adversarial_cross_tenant_isolation(): void
    {
        $this->actingAs($this->ownerA);

        $vehicleA = $this->orgA->vehicles()->create([
            'plate_number' => '3A-SECRET-1',
            'type' => 'rigid_truck',
            'make_model' => 'Hino 500',
            'max_payload_kg' => 10000,
        ]);

        $tripA = $this->orgA->dispatchTrips()->create([
            'trip_number' => 'TRP-SECRET-1',
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
        ]);

        // Switch to Tenant B
        $this->actingAs($this->ownerB);

        // Tenant B cannot view Tenant A's vehicle or trip -> 404
        $this->getJson($this->url($this->orgB, "vehicles/{$vehicleA->id}"))->assertNotFound();
        $this->getJson($this->url($this->orgB, "trips/{$tripA->id}"))->assertNotFound();

        // Tenant B cannot access Tenant A's endpoint path -> 404
        $this->getJson($this->url($this->orgA, 'vehicles'))->assertNotFound();

        // Tenant B cannot create a trip hijacking Tenant A's vehicle
        $locB = $this->orgB->locations()->create([
            'name' => 'Bangkok Warehouse',
            'type' => 'warehouse',
            'address_line_1' => 'Rama IV',
            'city' => 'Bangkok',
            'country_code' => 'TH',
        ]);

        $this->postJson($this->url($this->orgB, 'trips'), [
            'vehicle_id' => $vehicleA->id,
            'origin_location_id' => $locB->id,
            'destination_location_id' => $locB->id,
        ])->assertUnprocessable();
    }

    public function test_rbac_viewer_is_read_only(): void
    {
        $viewer = User::factory()->create();
        $this->orgA->memberships()->create([
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        $this->actingAs($viewer);

        // Viewer CAN view catalog and list
        $this->getJson($this->url($this->orgA, 'catalog'))->assertOk();
        $this->getJson($this->url($this->orgA, 'vehicles'))->assertOk();
        $this->getJson($this->url($this->orgA, 'trips'))->assertOk();

        // Viewer CANNOT create vehicle
        $this->postJson($this->url($this->orgA, 'vehicles'), [
            'plate_number' => '3A-FORBIDDEN',
            'type' => 'rigid_truck',
            'make_model' => 'Hino',
            'max_payload_kg' => 5000,
        ])->assertForbidden();

        // Viewer CANNOT create trip
        $this->postJson($this->url($this->orgA, 'trips'), [
            'origin_location_id' => $this->originA->id,
            'destination_location_id' => $this->destA->id,
        ])->assertForbidden();
    }
}
