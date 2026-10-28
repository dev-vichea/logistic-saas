<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo data is only available in local and testing environments.');
        }
        DB::transaction(function () {
            $owner = User::firstOrCreate(['email' => 'dara@mekong.test'], ['name' => 'Dara Sok', 'password' => 'MekongDemo2026!', 'email_verified_at' => now()]);
            foreach (['Mekong Freight Co.', 'Angkor Express'] as $index => $name) {
                $org = Organization::firstOrCreate(['name' => $name], ['legal_name' => $name.' Ltd.', 'email' => 'hello@mekong.test', 'phone' => '+855 23 456 789', 'city' => 'Phnom Penh', 'address' => 'No. 28, Street 2004, Sen Sok, Phnom Penh', 'country_code' => 'KH', 'currency' => 'USD', 'timezone' => 'Asia/Phnom_Penh', 'activities' => $index ? ['last_mile'] : ['road_transport', 'freight_forwarding', 'customs_brokerage']]);
                $org->memberships()->firstOrCreate(['user_id' => $owner->id], ['role' => 'owner']);
                if ($index) {
                    continue;
                }
                foreach (['Operations', 'Customer Success', 'Finance'] as $department) {
                    $org->departments()->firstOrCreate(['name' => $department], ['description' => 'Our '.$department.' team.']);
                }
                foreach (['Sophea Chan' => 'admin', 'Vichea Lim' => 'manager', 'Sreyneang Kim' => 'member'] as $name => $role) {
                    $person = User::firstOrCreate(['email' => str_replace(' ', '.', strtolower($name)).'@mekong.test'], ['name' => $name, 'password' => bin2hex(random_bytes(32)), 'email_verified_at' => now()]);
                    $org->memberships()->firstOrCreate(['user_id' => $person->id], ['role' => $role, 'department_id' => $org->departments()->first()->id]);
                }
                $org->audits()->firstOrCreate(['action' => 'organization.created'], ['actor_id' => $owner->id, 'metadata' => [], 'created_at' => now()]);

                // Sample Business Partners & Locations
                $customer = $org->partners()->firstOrCreate(
                    ['name' => 'Angkor Garments Manufacturing Ltd'],
                    [
                        'legal_name' => 'Angkor Garments Manufacturing Co., Ltd.',
                        'code' => 'AGM-KH',
                        'roles' => ['customer', 'shipper'],
                        'country_code' => 'KH',
                        'email' => 'shipping@angkorgarments.test',
                    ]
                );
                $carrier = $org->partners()->firstOrCreate(
                    ['name' => 'Mekong River Trucking Fleet'],
                    [
                        'legal_name' => 'Mekong River Trucking Co., Ltd.',
                        'code' => 'MRT-EXP',
                        'roles' => ['carrier'],
                        'country_code' => 'KH',
                    ]
                );

                $origin = $org->locations()->firstOrCreate(
                    ['name' => 'Phnom Penh Dry Port & Logistics Hub'],
                    [
                        'type' => 'warehouse',
                        'address_line_1' => 'National Road 4, Chaom Chau',
                        'city' => 'Phnom Penh',
                        'country_code' => 'KH',
                        'latitude' => 11.5312000,
                        'longitude' => 104.8324000,
                        'is_primary' => true,
                    ]
                );
                $destination = $org->locations()->firstOrCreate(
                    ['name' => 'Sihanoukville Autonomous Port Terminal 2'],
                    [
                        'type' => 'port',
                        'address_line_1' => 'Port Commercial Zone',
                        'city' => 'Sihanoukville',
                        'country_code' => 'KH',
                        'latitude' => 10.6385000,
                        'longitude' => 103.5042000,
                        'is_primary' => false,
                    ]
                );

                // Sample Shipment
                $shipment = $org->shipments()->firstOrCreate(
                    ['shipment_number' => 'SH-2026-0001'],
                    [
                        'customer_id' => $customer->id,
                        'carrier_id' => $carrier->id,
                        'origin_location_id' => $origin->id,
                        'destination_location_id' => $destination->id,
                        'transport_mode' => 'multimodal',
                        'master_tracking_number' => 'MK-EXP-2026-901',
                        'status' => 'in_transit',
                        'customs_status' => 'cleared',
                        'commercial_status' => 'confirmed',
                        'etd' => now()->subDay(),
                        'atd' => now()->subDay(),
                        'eta' => now()->addDays(2),
                        'special_instructions' => 'Garment export containers; priority clearance at Sihanoukville Port Gate 3.',
                    ]
                );

                if ($shipment->wasRecentlyCreated || $shipment->cargoItems()->count() === 0) {
                    $shipment->cargoItems()->create([
                        'organization_id' => $org->id,
                        'description' => 'Cotton Sportswear & Knitted Shirts',
                        'commodity' => 'Garments',
                        'hs_code' => '6109.10',
                        'package_type' => 'cartons',
                        'quantity' => 450,
                        'container_number' => 'TGHU9821034',
                        'seal_number' => 'SEAL-88901',
                        'gross_weight_kg' => 4200,
                        'net_weight_kg' => 3800,
                        'volume_cbm' => 24.5,
                    ]);

                    $shipment->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 1,
                        'leg_type' => 'pre_carriage',
                        'transport_mode' => 'road',
                        'carrier_id' => $carrier->id,
                        'origin_location_id' => $origin->id,
                        'destination_location_id' => $destination->id,
                        'vessel_or_flight_or_plate' => '3C-9921 / Tr-04',
                        'scheduled_departure' => now()->subDay(),
                        'actual_departure' => now()->subDay(),
                        'scheduled_arrival' => now(),
                        'actual_arrival' => now(),
                        'status' => 'completed',
                    ]);

                    $shipment->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 2,
                        'leg_type' => 'main_carriage',
                        'transport_mode' => 'ocean',
                        'carrier_id' => $carrier->id,
                        'origin_location_id' => $destination->id,
                        'destination_location_id' => $destination->id,
                        'vessel_or_flight_or_plate' => 'Mekong Pioneer V.2601',
                        'voyage_or_trip_number' => 'VOY-2601E',
                        'scheduled_departure' => now()->addDay(),
                        'scheduled_arrival' => now()->addDays(3),
                        'status' => 'scheduled',
                    ]);

                    $shipment->participants()->create([
                        'organization_id' => $org->id,
                        'business_partner_id' => $customer->id,
                        'role' => 'shipper',
                    ]);

                    $shipment->participants()->create([
                        'organization_id' => $org->id,
                        'business_partner_id' => $carrier->id,
                        'role' => 'carrier',
                    ]);

                    $shipment->milestones()->create([
                        'organization_id' => $org->id,
                        'code' => 'SHIPMENT_CREATED',
                        'title' => 'Shipment Booked & Manifest Created',
                        'occurred_at' => now()->subDays(2),
                        'created_by_user_id' => $owner->id,
                    ]);

                    $shipment->milestones()->create([
                        'organization_id' => $org->id,
                        'code' => 'GATE_IN_ORIGIN',
                        'title' => 'Container Loaded at Phnom Penh Dry Port',
                        'location_name' => 'Phnom Penh Dry Port Gate 1',
                        'location_id' => $origin->id,
                        'occurred_at' => now()->subDay(),
                        'created_by_user_id' => $owner->id,
                    ]);

                    $shipment->milestones()->create([
                        'organization_id' => $org->id,
                        'code' => 'CUSTOMS_CLEARED',
                        'title' => 'Export ASYCUDA Declaration Cleared',
                        'location_name' => 'Customs Clearance Office',
                        'description' => 'Export declaration reference GDCE-2026-08129 approved with CDC quota verification.',
                        'occurred_at' => now()->subHours(6),
                        'created_by_user_id' => $owner->id,
                    ]);

                    $shipment->milestones()->create([
                        'organization_id' => $org->id,
                        'code' => 'IN_TRANSIT',
                        'title' => 'En Route on National Road 4 Express Corridor',
                        'location_name' => 'Kampong Speu Transit Point',
                        'description' => 'Convoy passing intermediate telemetry checkpoint on schedule.',
                        'occurred_at' => now()->subHours(2),
                        'created_by_user_id' => $owner->id,
                    ]);
                }
            }
        });
    }
}
