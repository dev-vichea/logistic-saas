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
            $owner = User::firstOrCreate(
                ['email' => 'dara@mekong.test'],
                ['name' => 'Dara Sok', 'password' => 'MekongDemo2026!', 'email_verified_at' => now()]
            );

            foreach (['Mekong Freight Co.', 'Angkor Express'] as $index => $name) {
                $org = Organization::firstOrCreate(
                    ['name' => $name],
                    [
                        'legal_name' => $name.' Ltd.',
                        'email' => 'hello@mekong.test',
                        'phone' => '+855 23 456 789',
                        'city' => 'Phnom Penh',
                        'address' => 'No. 28, Street 2004, Sen Sok, Phnom Penh',
                        'country_code' => 'KH',
                        'currency' => 'USD',
                        'timezone' => 'Asia/Phnom_Penh',
                        'activities' => $index ? ['last_mile'] : ['road_transport', 'freight_forwarding', 'customs_brokerage'],
                    ]
                );

                $org->memberships()->firstOrCreate(['user_id' => $owner->id], ['role' => 'owner']);

                if ($index) {
                    continue;
                }

                // Departments
                foreach (['Operations', 'Customer Success', 'Finance'] as $department) {
                    $org->departments()->firstOrCreate(['name' => $department], ['description' => 'Our '.$department.' team.']);
                }

                // Teammates
                foreach (['Sophea Chan' => 'admin', 'Vichea Lim' => 'manager', 'Sreyneang Kim' => 'member'] as $memberName => $role) {
                    $person = User::firstOrCreate(
                        ['email' => str_replace(' ', '.', strtolower($memberName)).'@mekong.test'],
                        ['name' => $memberName, 'password' => bin2hex(random_bytes(32)), 'email_verified_at' => now()]
                    );
                    $org->memberships()->firstOrCreate(
                        ['user_id' => $person->id],
                        ['role' => $role, 'department_id' => $org->departments()->first()->id]
                    );
                }

                $org->audits()->firstOrCreate(
                    ['action' => 'organization.created'],
                    ['actor_id' => $owner->id, 'metadata' => [], 'created_at' => now()]
                );

                // ------------------------------------------------------------
                // 1. Business Partners (Customers, Carriers, Brokers, Consignees)
                // ------------------------------------------------------------
                $customerGarments = $org->partners()->firstOrCreate(
                    ['name' => 'Angkor Garments Manufacturing Ltd'],
                    [
                        'legal_name' => 'Angkor Garments Manufacturing Co., Ltd.',
                        'code' => 'AGM-KH',
                        'roles' => ['customer', 'shipper'],
                        'country_code' => 'KH',
                        'email' => 'shipping@angkorgarments.test',
                        'phone' => '+855 23 881 200',
                    ]
                );

                $customerAgri = $org->partners()->firstOrCreate(
                    ['name' => 'Mekong Agri Exports Co., Ltd.'],
                    [
                        'legal_name' => 'Mekong Agricultural Products Export Co., Ltd.',
                        'code' => 'MAE-KH',
                        'roles' => ['customer', 'shipper'],
                        'country_code' => 'KH',
                        'email' => 'trade@mekongagri.test',
                        'phone' => '+855 23 772 100',
                    ]
                );

                $customerElectronics = $org->partners()->firstOrCreate(
                    ['name' => 'Phnom Penh Precision Electronics Inc.'],
                    [
                        'legal_name' => 'Phnom Penh Precision Electronics Assembly Co., Ltd.',
                        'code' => 'PPE-KH',
                        'roles' => ['customer', 'shipper', 'supplier'],
                        'country_code' => 'KH',
                        'email' => 'logistics@ppprecision.test',
                        'phone' => '+855 23 993 400',
                    ]
                );

                $carrierTrucking = $org->partners()->firstOrCreate(
                    ['name' => 'Mekong River Trucking Fleet'],
                    [
                        'legal_name' => 'Mekong River Trucking & Haulage Co., Ltd.',
                        'code' => 'MRT-EXP',
                        'roles' => ['carrier'],
                        'country_code' => 'KH',
                        'email' => 'dispatch@mekongtrucking.test',
                        'phone' => '+855 12 345 678',
                    ]
                );

                $carrierOcean = $org->partners()->firstOrCreate(
                    ['name' => 'Pacific Eagle Ocean Container Line'],
                    [
                        'legal_name' => 'Pacific Eagle Shipping Agency (Cambodia) Ltd.',
                        'code' => 'PEO-LINE',
                        'roles' => ['carrier', 'freight_forwarder'],
                        'country_code' => 'KH',
                        'email' => 'bookings@pacificeagle.test',
                        'phone' => '+855 23 441 900',
                    ]
                );

                $carrierAir = $org->partners()->firstOrCreate(
                    ['name' => 'SkyMekong Cargo Express'],
                    [
                        'legal_name' => 'SkyMekong Aviation Cargo Services Ltd.',
                        'code' => 'SMC-AIR',
                        'roles' => ['carrier'],
                        'country_code' => 'KH',
                        'email' => 'cargo@skymekong.test',
                        'phone' => '+855 23 889 001',
                    ]
                );

                $brokerCustoms = $org->partners()->firstOrCreate(
                    ['name' => 'Khmer Customs Clearance & Consulting Group'],
                    [
                        'legal_name' => 'Khmer Customs Clearance Services Co., Ltd.',
                        'code' => 'KCC-BROKER',
                        'roles' => ['broker'],
                        'country_code' => 'KH',
                        'email' => 'clearance@khmercustoms.test',
                        'phone' => '+855 23 661 220',
                    ]
                );

                $consigneeEuro = $org->partners()->firstOrCreate(
                    ['name' => 'EuroRetail Logistics & Distribution BV'],
                    [
                        'legal_name' => 'EuroRetail Distribution Logistics B.V.',
                        'code' => 'EUR-NL',
                        'roles' => ['consignee', 'customer'],
                        'country_code' => 'NL',
                        'email' => 'inbound@euroretail.test',
                    ]
                );

                $consigneeUSA = $org->partners()->firstOrCreate(
                    ['name' => 'California Apparel Importers LLC'],
                    [
                        'legal_name' => 'California Fashion & Apparel Importers LLC',
                        'code' => 'CAI-US',
                        'roles' => ['consignee', 'customer'],
                        'country_code' => 'US',
                        'email' => 'receiving@californiaapparel.test',
                    ]
                );

                // ------------------------------------------------------------
                // 2. Facilities & Locations
                // ------------------------------------------------------------
                $locDryPort = $org->locations()->firstOrCreate(
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

                $locPortPAS = $org->locations()->firstOrCreate(
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

                $locPPSEZ = $org->locations()->firstOrCreate(
                    ['name' => 'Phnom Penh Special Economic Zone (PPSEZ) Hub'],
                    [
                        'type' => 'delivery_site',
                        'address_line_1' => 'National Road 4, Khan Kamboul',
                        'city' => 'Phnom Penh',
                        'country_code' => 'KH',
                        'latitude' => 11.5167000,
                        'longitude' => 104.7667000,
                        'is_primary' => false,
                    ]
                );

                $locBavet = $org->locations()->firstOrCreate(
                    ['name' => 'Bavet / Moc Bai International Border Gate'],
                    [
                        'type' => 'delivery_site',
                        'address_line_1' => 'National Road 1, Bavet City',
                        'city' => 'Bavet',
                        'country_code' => 'KH',
                        'latitude' => 11.0789000,
                        'longitude' => 106.1667000,
                        'is_primary' => false,
                    ]
                );

                $locAirportTIA = $org->locations()->firstOrCreate(
                    ['name' => 'Techo International Airport Air Cargo Terminal'],
                    [
                        'type' => 'airport',
                        'address_line_1' => 'Prek Sleng, Kandal Province',
                        'city' => 'Kandal',
                        'country_code' => 'KH',
                        'latitude' => 11.3650000,
                        'longitude' => 104.9120000,
                        'is_primary' => false,
                    ]
                );

                $locRotterdam = $org->locations()->firstOrCreate(
                    ['name' => 'Port of Rotterdam Maasvlakte Terminal'],
                    [
                        'type' => 'port',
                        'address_line_1' => 'Europaweg 902, Maasvlakte',
                        'city' => 'Rotterdam',
                        'country_code' => 'NL',
                        'is_primary' => false,
                    ]
                );

                $locLongBeach = $org->locations()->firstOrCreate(
                    ['name' => 'Port of Long Beach Pier T Container Yard'],
                    [
                        'type' => 'port',
                        'address_line_1' => 'Pier T Avenue, Terminal Island',
                        'city' => 'Long Beach',
                        'country_code' => 'US',
                        'is_primary' => false,
                    ]
                );

                // ------------------------------------------------------------
                // 3. Freight Requests (Commercial Inquiries)
                // ------------------------------------------------------------
                $req1 = $org->freightRequests()->firstOrCreate(
                    ['request_number' => 'REQ-2026-0001'],
                    [
                        'customer_id' => $customerGarments->id,
                        'shipper_id' => $customerGarments->id,
                        'consignee_id' => $consigneeEuro->id,
                        'origin_location_id' => $locDryPort->id,
                        'destination_location_id' => $locRotterdam->id,
                        'transport_mode' => 'multimodal',
                        'incoterm' => 'FOB',
                        'status' => 'quoted',
                        'cargo_description' => '450 cartons cotton sport shirts & knitted polo apparel',
                        'package_type' => 'cartons',
                        'total_pieces' => 450,
                        'total_weight_kg' => 4200,
                        'total_volume_cbm' => 24.5,
                        'target_readiness_date' => now()->subDays(5),
                        'target_delivery_date' => now()->addDays(20),
                        'notes' => 'Seasonal summer collection for European retailers. Requires CDC quota duty exemption certificate.',
                    ]
                );

                $req2 = $org->freightRequests()->firstOrCreate(
                    ['request_number' => 'REQ-2026-0002'],
                    [
                        'customer_id' => $customerAgri->id,
                        'shipper_id' => $customerAgri->id,
                        'consignee_id' => $consigneeUSA->id,
                        'origin_location_id' => $locPortPAS->id,
                        'destination_location_id' => $locLongBeach->id,
                        'transport_mode' => 'ocean_fcl',
                        'incoterm' => 'CIF',
                        'status' => 'reviewing',
                        'cargo_description' => '2 x 40ft High Cube containers of Premium Cambodian Fragrant Jasmine Rice (Phka Rumduol)',
                        'package_type' => 'bags',
                        'total_pieces' => 1200,
                        'total_weight_kg' => 48000,
                        'total_volume_cbm' => 68.0,
                        'target_readiness_date' => now()->addDays(2),
                        'target_delivery_date' => now()->addDays(32),
                        'notes' => 'Fumigation and phytosanitary certificate issued by Ministry of Agriculture.',
                    ]
                );

                $req3 = $org->freightRequests()->firstOrCreate(
                    ['request_number' => 'REQ-2026-0003'],
                    [
                        'customer_id' => $customerElectronics->id,
                        'shipper_id' => $customerElectronics->id,
                        'origin_location_id' => $locPPSEZ->id,
                        'destination_location_id' => $locAirportTIA->id,
                        'transport_mode' => 'air',
                        'incoterm' => 'FCA',
                        'status' => 'submitted',
                        'cargo_description' => '15 cartons precision automotive sensor components and circuit boards',
                        'package_type' => 'cartons',
                        'total_pieces' => 15,
                        'total_weight_kg' => 320,
                        'total_volume_cbm' => 1.8,
                        'is_temperature_controlled' => true,
                        'target_readiness_date' => now()->addDay(),
                        'notes' => 'High-priority manufacturing samples for Thailand assembly plant.',
                    ]
                );

                // ------------------------------------------------------------
                // 4. Quotations (Commercial Proposals & Line Items)
                // ------------------------------------------------------------
                $quo1 = $org->quotations()->firstOrCreate(
                    ['quotation_number' => 'QUO-2026-0001', 'revision' => 0],
                    [
                        'freight_request_id' => $req1->id,
                        'customer_id' => $customerGarments->id,
                        'origin_location_id' => $locDryPort->id,
                        'destination_location_id' => $locRotterdam->id,
                        'transport_mode' => 'multimodal',
                        'incoterm' => 'FOB',
                        'currency' => 'USD',
                        'subtotal_amount' => 1450.00,
                        'tax_amount' => 0.00,
                        'total_amount' => 1450.00,
                        'status' => 'sent',
                        'valid_until' => now()->addDays(14),
                        'terms_and_conditions' => 'Payment terms 30 days from Bill of Lading date. Subject to standard BAF adjustments.',
                    ]
                );

                if ($quo1->wasRecentlyCreated || $quo1->lineItems()->count() === 0) {
                    $quo1->lineItems()->createMany([
                        [
                            'organization_id' => $org->id,
                            'description' => 'Inland Haulage from Phnom Penh Dry Port to Sihanoukville Port',
                            'charge_type' => 'freight',
                            'quantity' => 1,
                            'unit_price' => 450.00,
                            'total_amount' => 450.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Ocean Freight Carriage Sihanoukville to Rotterdam (1x40ft HC)',
                            'charge_type' => 'freight',
                            'quantity' => 1,
                            'unit_price' => 750.00,
                            'total_amount' => 750.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Export Terminal Handling Charge (THC) at Port of Sihanoukville',
                            'charge_type' => 'origin_handling',
                            'quantity' => 1,
                            'unit_price' => 150.00,
                            'total_amount' => 150.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'ASYCUDA Customs Lodgement & Export Documentation Fee',
                            'charge_type' => 'customs',
                            'quantity' => 1,
                            'unit_price' => 100.00,
                            'total_amount' => 100.00,
                            'currency' => 'USD',
                        ],
                    ]);
                }

                // Revision 1 (Negotiated and Accepted)
                $quo1Rev1 = $org->quotations()->firstOrCreate(
                    ['quotation_number' => 'QUO-2026-0001', 'revision' => 1],
                    [
                        'freight_request_id' => $req1->id,
                        'customer_id' => $customerGarments->id,
                        'origin_location_id' => $locDryPort->id,
                        'destination_location_id' => $locRotterdam->id,
                        'transport_mode' => 'multimodal',
                        'incoterm' => 'FOB',
                        'currency' => 'USD',
                        'subtotal_amount' => 1380.00,
                        'tax_amount' => 0.00,
                        'total_amount' => 1380.00,
                        'status' => 'accepted',
                        'valid_until' => now()->addDays(10),
                        'notes' => 'Volume rebate of $70 applied for client annual commitment.',
                    ]
                );

                if ($quo1Rev1->wasRecentlyCreated || $quo1Rev1->lineItems()->count() === 0) {
                    $quo1Rev1->lineItems()->createMany([
                        [
                            'organization_id' => $org->id,
                            'description' => 'Inland Haulage from Phnom Penh Dry Port to Sihanoukville Port',
                            'charge_type' => 'freight',
                            'quantity' => 1,
                            'unit_price' => 430.00,
                            'total_amount' => 430.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Ocean Freight Carriage Sihanoukville to Rotterdam (1x40ft HC)',
                            'charge_type' => 'freight',
                            'quantity' => 1,
                            'unit_price' => 700.00,
                            'total_amount' => 700.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Export Terminal Handling Charge (THC) at Port of Sihanoukville',
                            'charge_type' => 'origin_handling',
                            'quantity' => 1,
                            'unit_price' => 150.00,
                            'total_amount' => 150.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'ASYCUDA Customs Lodgement & Export Documentation Fee',
                            'charge_type' => 'customs',
                            'quantity' => 1,
                            'unit_price' => 100.00,
                            'total_amount' => 100.00,
                            'currency' => 'USD',
                        ],
                    ]);
                }

                // Quotation 2 (Rice to Long Beach)
                $quo2 = $org->quotations()->firstOrCreate(
                    ['quotation_number' => 'QUO-2026-0002', 'revision' => 0],
                    [
                        'freight_request_id' => $req2->id,
                        'customer_id' => $customerAgri->id,
                        'origin_location_id' => $locPortPAS->id,
                        'destination_location_id' => $locLongBeach->id,
                        'transport_mode' => 'ocean_fcl',
                        'incoterm' => 'CIF',
                        'currency' => 'USD',
                        'subtotal_amount' => 3200.00,
                        'tax_amount' => 0.00,
                        'total_amount' => 3200.00,
                        'status' => 'sent',
                        'valid_until' => now()->addDays(7),
                    ]
                );

                if ($quo2->wasRecentlyCreated || $quo2->lineItems()->count() === 0) {
                    $quo2->lineItems()->createMany([
                        [
                            'organization_id' => $org->id,
                            'description' => 'Ocean Freight Carriage Sihanoukville to Long Beach (2x40ft HC)',
                            'charge_type' => 'freight',
                            'quantity' => 2,
                            'unit_price' => 1400.00,
                            'total_amount' => 2800.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Port Terminal & Drayage Handling',
                            'charge_type' => 'origin_handling',
                            'quantity' => 2,
                            'unit_price' => 120.00,
                            'total_amount' => 240.00,
                            'currency' => 'USD',
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Customs Clearance & Phytosanitary Verification',
                            'charge_type' => 'customs',
                            'quantity' => 1,
                            'unit_price' => 160.00,
                            'total_amount' => 160.00,
                            'currency' => 'USD',
                        ],
                    ]);
                }

                // ------------------------------------------------------------
                // 5. Commercial Bookings (Orders)
                // ------------------------------------------------------------
                $booking1 = $org->bookings()->firstOrCreate(
                    ['booking_number' => 'BK-2026-0001'],
                    [
                        'quotation_id' => $quo1Rev1->id,
                        'customer_id' => $customerGarments->id,
                        'shipper_id' => $customerGarments->id,
                        'consignee_id' => $consigneeEuro->id,
                        'origin_location_id' => $locDryPort->id,
                        'destination_location_id' => $locRotterdam->id,
                        'transport_mode' => 'multimodal',
                        'incoterm' => 'FOB',
                        'customer_reference' => 'PO-EUR-88910',
                        'status' => 'in_progress',
                        'total_amount' => 1380.00,
                        'currency' => 'USD',
                        'notes' => 'Commercial order confirmed by EuroRetail procurement officer.',
                    ]
                );

                $booking2 = $org->bookings()->firstOrCreate(
                    ['booking_number' => 'BK-2026-0002'],
                    [
                        'quotation_id' => $quo2->id,
                        'customer_id' => $customerAgri->id,
                        'shipper_id' => $customerAgri->id,
                        'consignee_id' => $consigneeUSA->id,
                        'origin_location_id' => $locPortPAS->id,
                        'destination_location_id' => $locLongBeach->id,
                        'transport_mode' => 'ocean_fcl',
                        'incoterm' => 'CIF',
                        'customer_reference' => 'PO-USA-90123',
                        'status' => 'confirmed',
                        'total_amount' => 3200.00,
                        'currency' => 'USD',
                    ]
                );

                $booking3 = $org->bookings()->firstOrCreate(
                    ['booking_number' => 'BK-2026-0003'],
                    [
                        'customer_id' => $customerElectronics->id,
                        'origin_location_id' => $locPPSEZ->id,
                        'destination_location_id' => $locBavet->id,
                        'transport_mode' => 'road',
                        'incoterm' => 'DAP',
                        'customer_reference' => 'PO-TH-55102',
                        'status' => 'draft',
                        'total_amount' => 520.00,
                        'currency' => 'USD',
                    ]
                );

                // ------------------------------------------------------------
                // 6. Operational Shipments, Legs, Cargo & Milestones
                // ------------------------------------------------------------

                // Shipment 1: Multimodal Garments Export to Rotterdam (Active In Transit)
                $shipment1 = $org->shipments()->firstOrCreate(
                    ['shipment_number' => 'SH-2026-0001'],
                    [
                        'booking_id' => $booking1->id,
                        'customer_id' => $customerGarments->id,
                        'carrier_id' => $carrierTrucking->id,
                        'origin_location_id' => $locDryPort->id,
                        'destination_location_id' => $locRotterdam->id,
                        'transport_mode' => 'multimodal',
                        'master_tracking_number' => 'MK-EXP-2026-901',
                        'status' => 'in_transit',
                        'customs_status' => 'cleared',
                        'commercial_status' => 'confirmed',
                        'etd' => now()->subDay(),
                        'atd' => now()->subDay(),
                        'eta' => now()->addDays(18),
                        'special_instructions' => 'Garment export container; priority clearance at Sihanoukville Port Gate 3.',
                    ]
                );

                if ($shipment1->wasRecentlyCreated || $shipment1->cargoItems()->count() === 0) {
                    $shipment1->cargoItems()->create([
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

                    $leg1 = $shipment1->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 1,
                        'leg_type' => 'pre_carriage',
                        'transport_mode' => 'road',
                        'carrier_id' => $carrierTrucking->id,
                        'origin_location_id' => $locDryPort->id,
                        'destination_location_id' => $locPortPAS->id,
                        'vessel_or_flight_or_plate' => '3C-9921 / Tr-04',
                        'scheduled_departure' => now()->subDay(),
                        'actual_departure' => now()->subDay(),
                        'scheduled_arrival' => now(),
                        'actual_arrival' => now(),
                        'status' => 'completed',
                    ]);

                    $leg2 = $shipment1->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 2,
                        'leg_type' => 'main_carriage',
                        'transport_mode' => 'ocean',
                        'carrier_id' => $carrierOcean->id,
                        'origin_location_id' => $locPortPAS->id,
                        'destination_location_id' => $locRotterdam->id,
                        'vessel_or_flight_or_plate' => 'Mekong Pioneer V.2601',
                        'voyage_or_trip_number' => 'VOY-2601E',
                        'scheduled_departure' => now()->addDay(),
                        'scheduled_arrival' => now()->addDays(18),
                        'status' => 'scheduled',
                    ]);

                    $shipment1->participants()->createMany([
                        ['organization_id' => $org->id, 'business_partner_id' => $customerGarments->id, 'role' => 'shipper'],
                        ['organization_id' => $org->id, 'business_partner_id' => $carrierTrucking->id, 'role' => 'carrier'],
                        ['organization_id' => $org->id, 'business_partner_id' => $carrierOcean->id, 'role' => 'carrier'],
                        ['organization_id' => $org->id, 'business_partner_id' => $brokerCustoms->id, 'role' => 'customs_broker'],
                    ]);

                    $shipment1->milestones()->createMany([
                        [
                            'organization_id' => $org->id,
                            'code' => 'SHIPMENT_CREATED',
                            'title' => 'Shipment Booked & Manifest Created',
                            'occurred_at' => now()->subDays(2),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'GATE_IN_ORIGIN',
                            'title' => 'Container Loaded at Phnom Penh Dry Port',
                            'location_name' => 'Phnom Penh Dry Port Gate 1',
                            'location_id' => $locDryPort->id,
                            'occurred_at' => now()->subDay(),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'CUSTOMS_CLEARED',
                            'title' => 'Export ASYCUDA Declaration Cleared',
                            'location_name' => 'Customs Clearance Office',
                            'description' => 'Export declaration reference GDCE-2026-08129 approved with CDC quota verification.',
                            'occurred_at' => now()->subHours(6),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'IN_TRANSIT',
                            'title' => 'En Route on National Road 4 Express Corridor',
                            'location_name' => 'Kampong Speu Transit Point',
                            'description' => 'Convoy passing intermediate telemetry checkpoint on schedule.',
                            'occurred_at' => now()->subHours(2),
                            'created_by_user_id' => $owner->id,
                        ],
                    ]);
                }

                // Shipment 2: Ocean FCL Rice Export to Long Beach (Planned & Staging)
                $shipment2 = $org->shipments()->firstOrCreate(
                    ['shipment_number' => 'SH-2026-0002'],
                    [
                        'booking_id' => $booking2->id,
                        'customer_id' => $customerAgri->id,
                        'carrier_id' => $carrierOcean->id,
                        'origin_location_id' => $locPortPAS->id,
                        'destination_location_id' => $locLongBeach->id,
                        'transport_mode' => 'ocean_fcl',
                        'master_tracking_number' => 'PEO-B/L-449102',
                        'status' => 'planned',
                        'customs_status' => 'declaration_drafted',
                        'commercial_status' => 'confirmed',
                        'etd' => now()->addDays(2),
                        'eta' => now()->addDays(28),
                        'special_instructions' => 'Fumigation tags attached to container doors. Maintain humidity standards below 14%.',
                    ]
                );

                if ($shipment2->wasRecentlyCreated || $shipment2->cargoItems()->count() === 0) {
                    $shipment2->cargoItems()->createMany([
                        [
                            'organization_id' => $org->id,
                            'description' => 'Phka Rumduol Fragrant Jasmine Rice (Grade A)',
                            'commodity' => 'Milled Rice',
                            'hs_code' => '1006.30',
                            'package_type' => 'bags',
                            'quantity' => 600,
                            'container_number' => 'MSCU1029384',
                            'seal_number' => 'SEAL-77102',
                            'gross_weight_kg' => 24000,
                            'net_weight_kg' => 23800,
                            'volume_cbm' => 34.0,
                        ],
                        [
                            'organization_id' => $org->id,
                            'description' => 'Phka Rumduol Fragrant Jasmine Rice (Grade A)',
                            'commodity' => 'Milled Rice',
                            'hs_code' => '1006.30',
                            'package_type' => 'bags',
                            'quantity' => 600,
                            'container_number' => 'MSCU8821940',
                            'seal_number' => 'SEAL-77103',
                            'gross_weight_kg' => 24000,
                            'net_weight_kg' => 23800,
                            'volume_cbm' => 34.0,
                        ],
                    ]);

                    $shipment2->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 1,
                        'leg_type' => 'main_carriage',
                        'transport_mode' => 'ocean',
                        'carrier_id' => $carrierOcean->id,
                        'origin_location_id' => $locPortPAS->id,
                        'destination_location_id' => $locLongBeach->id,
                        'vessel_or_flight_or_plate' => 'Pacific Trader V.094',
                        'voyage_or_trip_number' => 'PT-094W',
                        'scheduled_departure' => now()->addDays(2),
                        'scheduled_arrival' => now()->addDays(28),
                        'status' => 'scheduled',
                    ]);

                    $shipment2->participants()->createMany([
                        ['organization_id' => $org->id, 'business_partner_id' => $customerAgri->id, 'role' => 'shipper'],
                        ['organization_id' => $org->id, 'business_partner_id' => $consigneeUSA->id, 'role' => 'consignee'],
                        ['organization_id' => $org->id, 'business_partner_id' => $carrierOcean->id, 'role' => 'carrier'],
                    ]);

                    $shipment2->milestones()->createMany([
                        [
                            'organization_id' => $org->id,
                            'code' => 'SHIPMENT_CREATED',
                            'title' => 'Booking Confirmed with Pacific Eagle Line',
                            'occurred_at' => now()->subDay(),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'CUSTOMS_SUBMITTED',
                            'title' => 'Export Agricultural Clearance Submitted to CamControl & Customs',
                            'location_name' => 'Sihanoukville Customs Inspection Zone',
                            'occurred_at' => now()->subHours(4),
                            'created_by_user_id' => $owner->id,
                        ],
                    ]);
                }

                // Shipment 3: Air Express Sample to Bangkok (Delivered & POD Signed)
                $shipment3 = $org->shipments()->firstOrCreate(
                    ['shipment_number' => 'SH-2026-0003'],
                    [
                        'customer_id' => $customerElectronics->id,
                        'carrier_id' => $carrierAir->id,
                        'origin_location_id' => $locAirportTIA->id,
                        'destination_location_id' => $locPPSEZ->id,
                        'transport_mode' => 'air',
                        'master_tracking_number' => 'AWB-772-91023841',
                        'status' => 'delivered',
                        'customs_status' => 'released',
                        'commercial_status' => 'paid',
                        'etd' => now()->subDays(3),
                        'atd' => now()->subDays(3),
                        'eta' => now()->subDays(2),
                        'ata' => now()->subDays(2),
                        'special_instructions' => 'Temperature monitoring between 15°C - 25°C. Sensitive electronics.',
                    ]
                );

                if ($shipment3->wasRecentlyCreated || $shipment3->cargoItems()->count() === 0) {
                    $shipment3->cargoItems()->create([
                        'organization_id' => $org->id,
                        'description' => 'Precision Automotive Micro-Sensor Modules',
                        'commodity' => 'Electronic Sensors',
                        'hs_code' => '9031.80',
                        'package_type' => 'cartons',
                        'quantity' => 15,
                        'gross_weight_kg' => 320,
                        'volume_cbm' => 1.8,
                        'is_temperature_controlled' => true,
                        'temp_min_celsius' => 15.0,
                        'temp_max_celsius' => 25.0,
                    ]);

                    $shipment3->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 1,
                        'leg_type' => 'main_carriage',
                        'transport_mode' => 'air',
                        'carrier_id' => $carrierAir->id,
                        'origin_location_id' => $locAirportTIA->id,
                        'destination_location_id' => $locPPSEZ->id,
                        'vessel_or_flight_or_plate' => 'SM-902 Bangkok Flight',
                        'scheduled_departure' => now()->subDays(3),
                        'actual_departure' => now()->subDays(3),
                        'scheduled_arrival' => now()->subDays(2),
                        'actual_arrival' => now()->subDays(2),
                        'status' => 'completed',
                    ]);

                    $shipment3->milestones()->createMany([
                        [
                            'organization_id' => $org->id,
                            'code' => 'CARGO_RECEIVED',
                            'title' => 'Cargo Lodged at Techo International Airport Cargo Terminal',
                            'location_name' => 'TIA Air Cargo Terminal',
                            'occurred_at' => now()->subDays(3)->addHours(2),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'DEPARTED',
                            'title' => 'Cargo Flight SM-902 Departed for Bangkok',
                            'location_name' => 'Techo International Airport',
                            'occurred_at' => now()->subDays(3)->addHours(6),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'DELIVERED',
                            'title' => 'Consignee Received & Clean Proof of Delivery Signed',
                            'location_name' => 'Bangkok Factory Receiving Gate',
                            'occurred_at' => now()->subDays(2),
                            'created_by_user_id' => $owner->id,
                        ],
                    ]);
                }

                // Shipment 4: Cross-Border Trucking to Bavet / Vietnam Border (Dispatched)
                $shipment4 = $org->shipments()->firstOrCreate(
                    ['shipment_number' => 'SH-2026-0004'],
                    [
                        'booking_id' => $booking3->id,
                        'customer_id' => $customerElectronics->id,
                        'carrier_id' => $carrierTrucking->id,
                        'origin_location_id' => $locPPSEZ->id,
                        'destination_location_id' => $locBavet->id,
                        'transport_mode' => 'road',
                        'master_tracking_number' => 'ROAD-WAYBILL-2604',
                        'status' => 'dispatched',
                        'customs_status' => 'pending_docs',
                        'commercial_status' => 'pending',
                        'etd' => now()->subHours(4),
                        'atd' => now()->subHours(4),
                        'eta' => now()->addHours(6),
                        'special_instructions' => 'Cross-border transit through Bavet gate; customs broker representative waiting at border.',
                    ]
                );

                if ($shipment4->wasRecentlyCreated || $shipment4->cargoItems()->count() === 0) {
                    $shipment4->cargoItems()->create([
                        'organization_id' => $org->id,
                        'description' => 'Industrial Assembly Fasteners and Raw Harness Wiring',
                        'commodity' => 'Raw Materials',
                        'package_type' => 'pallets',
                        'quantity' => 28,
                        'gross_weight_kg' => 8600,
                        'volume_cbm' => 28.0,
                    ]);

                    $shipment4->legs()->create([
                        'organization_id' => $org->id,
                        'sequence' => 1,
                        'leg_type' => 'pre_carriage',
                        'transport_mode' => 'road',
                        'carrier_id' => $carrierTrucking->id,
                        'origin_location_id' => $locPPSEZ->id,
                        'destination_location_id' => $locBavet->id,
                        'vessel_or_flight_or_plate' => '3D-8812 / Semi-Trailer',
                        'scheduled_departure' => now()->subHours(4),
                        'actual_departure' => now()->subHours(4),
                        'scheduled_arrival' => now()->addHours(6),
                        'status' => 'in_transit',
                    ]);

                    $shipment4->participants()->createMany([
                        ['organization_id' => $org->id, 'business_partner_id' => $customerElectronics->id, 'role' => 'shipper'],
                        ['organization_id' => $org->id, 'business_partner_id' => $carrierTrucking->id, 'role' => 'carrier'],
                        ['organization_id' => $org->id, 'business_partner_id' => $brokerCustoms->id, 'role' => 'customs_broker'],
                    ]);

                    $shipment4->milestones()->createMany([
                        [
                            'organization_id' => $org->id,
                            'code' => 'CARGO_RECEIVED',
                            'title' => 'Picked Up from PPSEZ Factory Warehouse',
                            'location_name' => 'PPSEZ Zone 1',
                            'occurred_at' => now()->subHours(5),
                            'created_by_user_id' => $owner->id,
                        ],
                        [
                            'organization_id' => $org->id,
                            'code' => 'DISPATCHED',
                            'title' => 'Truck Departed Towards Bavet Border Checkpoint',
                            'location_name' => 'National Road 1 Corridor',
                            'occurred_at' => now()->subHours(4),
                            'created_by_user_id' => $owner->id,
                        ],
                    ]);
                }

                // --------------------------------------------------------
                // Transportation & Fleet Dispatch (v0.4)
                // --------------------------------------------------------
                $veh1 = $org->vehicles()->firstOrCreate(['plate_number' => '3A-8899'], [
                    'type' => 'rigid_truck',
                    'ownership_type' => 'owned',
                    'make_model' => 'Hino 500 FL8J 15T',
                    'year' => 2024,
                    'max_payload_kg' => 15000,
                    'volume_capacity_cbm' => 45.0,
                    'current_status' => 'available',
                    'notes' => 'Equipped with GPS telematics unit #KH-8821',
                ]);

                $veh2 = $org->vehicles()->firstOrCreate(['plate_number' => '3B-1122'], [
                    'type' => 'tractor_head',
                    'ownership_type' => 'owned',
                    'make_model' => 'Scania G410 Heavy Prime Mover',
                    'year' => 2023,
                    'max_payload_kg' => 32000,
                    'volume_capacity_cbm' => null,
                    'current_status' => 'dispatched',
                    'notes' => 'Dedicated cross-province container haulage',
                ]);

                $veh3 = $org->vehicles()->firstOrCreate(['plate_number' => '3C-4455'], [
                    'type' => 'container_chassis',
                    'ownership_type' => 'owned',
                    'make_model' => 'CIMC 40ft Tri-Axle Skeletal Trailer',
                    'year' => 2023,
                    'max_payload_kg' => 34000,
                    'volume_capacity_cbm' => null,
                    'current_status' => 'dispatched',
                ]);

                $veh4 = $org->vehicles()->firstOrCreate(['plate_number' => '3A-1234'], [
                    'type' => 'box_truck',
                    'ownership_type' => 'owned',
                    'make_model' => 'Isuzu NPR 75 Light Box Truck 5T',
                    'year' => 2025,
                    'max_payload_kg' => 5000,
                    'volume_capacity_cbm' => 22.0,
                    'current_status' => 'available',
                ]);

                $drv1 = $org->drivers()->firstOrCreate(['license_number' => 'DL-KH-001928'], [
                    'full_name' => 'Bunthorn Chea',
                    'phone' => '+855 12 778 899',
                    'email' => 'bunthorn.chea@mekong.test',
                    'license_type' => 'articulated_trailer',
                    'license_expires_at' => now()->addYears(2),
                    'current_status' => 'on_trip',
                    'notes' => 'Senior driver. 12 years cross-border Phnom Penh - Bavet and Sihanoukville.',
                ]);

                $drv2 = $org->drivers()->firstOrCreate(['license_number' => 'DL-KH-003344'], [
                    'full_name' => 'Sokha Meng',
                    'phone' => '+855 17 445 566',
                    'email' => 'sokha.meng@mekong.test',
                    'license_type' => 'heavy_truck',
                    'license_expires_at' => now()->addYears(3),
                    'current_status' => 'available',
                ]);

                $drv3 = $org->drivers()->firstOrCreate(['license_number' => 'DL-KH-005511'], [
                    'full_name' => 'Rithy Prom',
                    'phone' => '+855 92 667 788',
                    'license_type' => 'heavy_truck',
                    'license_expires_at' => now()->addYear(),
                    'current_status' => 'available',
                ]);

                // Trip 1: In Transit (Phnom Penh -> Sihanoukville Port)
                $trip1 = $org->dispatchTrips()->firstOrCreate(['trip_number' => 'TRP-2026-0001'], [
                    'vehicle_id' => $veh2->id,
                    'trailer_vehicle_id' => $veh3->id,
                    'driver_id' => $drv1->id,
                    'origin_location_id' => $locDryPort->id,
                    'destination_location_id' => $locPortPAS->id,
                    'status' => 'in_transit',
                    'scheduled_start_time' => now()->subHours(6),
                    'actual_start_time' => now()->subHours(5),
                    'scheduled_end_time' => now()->addHours(2),
                    'odometer_start_km' => 142300.0,
                    'container_number' => 'MSCU-889912-1',
                    'seal_number' => 'SL-77218',
                    'notes' => 'Pre-carriage leg for ocean export shipment SHP-2026-0001. Expressway route taken.',
                ]);

                $leg1 = $shipment1->legs()->first();
                if ($leg1) {
                    $trip1->tripLegs()->firstOrCreate(['shipment_leg_id' => $leg1->id], ['sequence' => 1, 'organization_id' => $org->id]);
                }

                // Trip 2: Completed with Signed POD (PPSEZ -> Bavet Border)
                $trip2 = $org->dispatchTrips()->firstOrCreate(['trip_number' => 'TRP-2026-0002'], [
                    'vehicle_id' => $veh1->id,
                    'driver_id' => $drv2->id,
                    'origin_location_id' => $locPPSEZ->id,
                    'destination_location_id' => $locBavet->id,
                    'status' => 'completed',
                    'scheduled_start_time' => now()->subHours(12),
                    'actual_start_time' => now()->subHours(11),
                    'scheduled_end_time' => now()->subHours(3),
                    'actual_end_time' => now()->subHours(2),
                    'odometer_start_km' => 98450.0,
                    'odometer_end_km' => 98625.5,
                    'container_number' => 'TGHU-221094-0',
                    'seal_number' => 'SL-44102',
                    'notes' => 'Direct factory haulage to Bavet transshipment depot. Delivered on time.',
                ]);

                $leg4 = $shipment4->legs()->first();
                if ($leg4) {
                    $trip2->tripLegs()->firstOrCreate(['shipment_leg_id' => $leg4->id], ['sequence' => 1, 'organization_id' => $org->id]);
                }

                $org->proofOfDeliveries()->firstOrCreate([
                    'dispatch_trip_id' => $trip2->id,
                    'shipment_id' => $shipment4->id,
                ], [
                    'recipient_name' => 'Vannak Heng (Bavet Cross-Border Depot)',
                    'recipient_phone' => '+855 44 991 223',
                    'delivered_at' => now()->subHours(2),
                    'received_packages' => 450,
                    'damaged_packages' => 0,
                    'discrepancy_notes' => null,
                    'signatory_remarks' => 'All cartons received in good order. Custom seals intact and border manifest signed.',
                ]);

                // Trip 3: Draft Run-Sheet (Scheduled for tomorrow)
                $org->dispatchTrips()->firstOrCreate(['trip_number' => 'TRP-2026-0003'], [
                    'vehicle_id' => $veh4->id,
                    'driver_id' => $drv3->id,
                    'origin_location_id' => $locDryPort->id,
                    'destination_location_id' => $locAirportTIA->id,
                    'status' => 'draft',
                    'scheduled_start_time' => now()->addHours(18),
                    'notes' => 'Airport air cargo feeder run. High priority garments sample shipment.',
                ]);

                // =========================================================
                // v0.5 Document Intelligence & Document Vault
                // =========================================================
                $docInvoice = $org->tradeDocuments()->firstOrCreate(['document_number' => '26TKYM164'], [
                    'shipment_id' => $shipment1->id,
                    'document_type' => 'commercial_invoice',
                    'file_name' => '清关---TK164拓卡-新彩福-柬埔寨资料.xls',
                    'file_path' => 'demo/26TKYM164_invoice.xls',
                    'file_size_bytes' => 63488,
                    'mime_type' => 'application/vnd.ms-excel',
                    'language' => 'zh-CN,en',
                    'status' => 'reconciled',
                    'confidence_score' => 96.5,
                    'extracted_metadata' => [
                        'invoice_no' => '26TKYM164',
                        'invoice_date' => '2026-10-15',
                        'contract_no' => '26TKYM164',
                        'supplier' => 'Ningbo Garment Machinery Equipment Co., Ltd',
                        'consignee' => 'Xin Cai Fu Garments (Cambodia) Co., Ltd',
                        'origin' => 'Ningbo / Shanghai Port',
                        'destination' => 'Sihanoukville Port / Phnom Penh',
                        'currency' => 'USD',
                    ],
                    'notes' => 'Supplier commercial invoice extracted via Document Intelligence engine.',
                    'created_by_user_id' => $owner->id,
                    'verified_by_user_id' => $owner->id,
                    'verified_at' => now()->subDays(1),
                ]);

                $docInvoice->items()->firstOrCreate(['line_number' => 1], [
                    'organization_id' => $org->id,
                    'hs_code' => '8452.29.00',
                    'description_original' => '工业缝纫机',
                    'description_english' => 'Industrial Sewing Machine',
                    'quantity' => 10,
                    'unit_of_measure' => 'SET',
                    'unit_price' => 350.00,
                    'total_amount' => 3500.00,
                    'package_count' => 10,
                    'package_type' => 'wooden_crates',
                    'gross_weight_kg' => 450.00,
                    'net_weight_kg' => 400.00,
                    'volume_cbm' => 2.500,
                    'match_status' => 'matched',
                ]);

                $docInvoice->items()->firstOrCreate(['line_number' => 2], [
                    'organization_id' => $org->id,
                    'hs_code' => '7326.90.90',
                    'description_original' => '堆垛架',
                    'description_english' => 'Stacking Rack',
                    'quantity' => 20,
                    'unit_of_measure' => 'PCS',
                    'unit_price' => 85.00,
                    'total_amount' => 1700.00,
                    'package_count' => 5,
                    'package_type' => 'steel_bundles',
                    'gross_weight_kg' => 320.00,
                    'net_weight_kg' => 300.00,
                    'volume_cbm' => 1.800,
                    'match_status' => 'matched',
                ]);

                $docInvoice->items()->firstOrCreate(['line_number' => 3], [
                    'organization_id' => $org->id,
                    'hs_code' => '9607.11.00',
                    'description_original' => '金属拉链',
                    'description_english' => 'Metal Zipper',
                    'quantity' => 5000,
                    'unit_of_measure' => 'METER',
                    'unit_price' => 0.45,
                    'total_amount' => 2250.00,
                    'package_count' => 15,
                    'package_type' => 'cartons',
                    'gross_weight_kg' => 180.00,
                    'net_weight_kg' => 165.00,
                    'volume_cbm' => 0.900,
                    'match_status' => 'matched',
                ]);

                $docInvoice->items()->firstOrCreate(['line_number' => 4], [
                    'organization_id' => $org->id,
                    'hs_code' => '8452.21.00',
                    'description_original' => '自动模板机',
                    'description_english' => 'Automatic Template Sewing Machine',
                    'quantity' => 2,
                    'unit_of_measure' => 'SET',
                    'unit_price' => 1250.00,
                    'total_amount' => 2500.00,
                    'package_count' => 2,
                    'package_type' => 'crates',
                    'gross_weight_kg' => 280.00,
                    'net_weight_kg' => 250.00,
                    'volume_cbm' => 1.400,
                    'match_status' => 'matched',
                ]);

                $docPacking = $org->tradeDocuments()->firstOrCreate(['document_number' => 'PL-26TKYM164'], [
                    'shipment_id' => $shipment1->id,
                    'document_type' => 'packing_list',
                    'file_name' => 'Packing_List_26TKYM164.xlsx',
                    'file_path' => 'demo/PL_26TKYM164.xlsx',
                    'file_size_bytes' => 48200,
                    'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'language' => 'zh-CN,en',
                    'status' => 'reconciled',
                    'confidence_score' => 97.0,
                    'extracted_metadata' => [
                        'contract_no' => '26TKYM164',
                        'supplier' => 'Ningbo Garment Machinery Equipment Co., Ltd',
                        'consignee' => 'Xin Cai Fu Garments (Cambodia) Co., Ltd',
                        'printed_totals' => [
                            'packages' => 32,
                            'gross_weight' => 1230.00,
                            'net_weight' => 1115.00,
                            'volume' => 6.600,
                        ],
                    ],
                    'notes' => 'Matching packing list with crate and carton breakdown.',
                    'created_by_user_id' => $owner->id,
                    'verified_by_user_id' => $owner->id,
                    'verified_at' => now()->subDays(1),
                ]);

                $docPacking->items()->firstOrCreate(['line_number' => 1], [
                    'organization_id' => $org->id,
                    'hs_code' => '8452.29.00',
                    'description_original' => '工业缝纫机',
                    'description_english' => 'Industrial Sewing Machine',
                    'quantity' => 10,
                    'unit_of_measure' => 'SET',
                    'package_count' => 10,
                    'package_type' => 'wooden_crates',
                    'gross_weight_kg' => 450.00,
                    'net_weight_kg' => 400.00,
                    'volume_cbm' => 2.500,
                    'match_status' => 'matched',
                ]);

                $docPacking->items()->firstOrCreate(['line_number' => 2], [
                    'organization_id' => $org->id,
                    'hs_code' => '7326.90.90',
                    'description_original' => '堆垛架',
                    'description_english' => 'Stacking Rack',
                    'quantity' => 20,
                    'unit_of_measure' => 'PCS',
                    'package_count' => 5,
                    'package_type' => 'steel_bundles',
                    'gross_weight_kg' => 320.00,
                    'net_weight_kg' => 300.00,
                    'volume_cbm' => 1.800,
                    'match_status' => 'matched',
                ]);

                $docPacking->items()->firstOrCreate(['line_number' => 3], [
                    'organization_id' => $org->id,
                    'hs_code' => '9607.11.00',
                    'description_original' => '金属拉链',
                    'description_english' => 'Metal Zipper',
                    'quantity' => 5000,
                    'unit_of_measure' => 'METER',
                    'package_count' => 15,
                    'package_type' => 'cartons',
                    'gross_weight_kg' => 180.00,
                    'net_weight_kg' => 165.00,
                    'volume_cbm' => 0.900,
                    'match_status' => 'matched',
                ]);

                $docPacking->items()->firstOrCreate(['line_number' => 4], [
                    'organization_id' => $org->id,
                    'hs_code' => '8452.21.00',
                    'description_original' => '自动模板机',
                    'description_english' => 'Automatic Template Sewing Machine',
                    'quantity' => 2,
                    'unit_of_measure' => 'SET',
                    'package_count' => 2,
                    'package_type' => 'crates',
                    'gross_weight_kg' => 280.00,
                    'net_weight_kg' => 250.00,
                    'volume_cbm' => 1.400,
                    'match_status' => 'matched',
                ]);

                // Reconciliation Record
                $org->documentReconciliations()->firstOrCreate([
                    'invoice_document_id' => $docInvoice->id,
                    'packing_list_document_id' => $docPacking->id,
                ], [
                    'shipment_id' => $shipment1->id,
                    'status' => 'balanced',
                    'total_invoice_items' => 4,
                    'total_packing_items' => 4,
                    'matched_items_count' => 4,
                    'discrepancy_count' => 0,
                    'invoice_total_quantity' => 5032.000,
                    'packing_total_quantity' => 5032.000,
                    'invoice_total_gross_weight' => 1230.00,
                    'packing_total_gross_weight' => 1230.00,
                    'discrepancies' => [],
                    'pairs' => [
                        ['status' => 'matched', 'issues' => []],
                        ['status' => 'matched', 'issues' => []],
                        ['status' => 'matched', 'issues' => []],
                        ['status' => 'matched', 'issues' => []],
                    ],
                    'reviewed_by_user_id' => $owner->id,
                    'reviewed_at' => now()->subDays(1),
                    'notes' => '100% matched across item descriptions, quantities, and weights.',
                ]);

                // Ocean Bill of Lading (House B/L)
                $org->tradeDocuments()->firstOrCreate(['document_number' => 'BL-YS26100022-1'], [
                    'shipment_id' => $shipment1->id,
                    'document_type' => 'bill_of_lading',
                    'file_name' => 'HBL电放-拆单_YS26100022-1.pdf',
                    'file_path' => 'demo/HBL_YS26100022.pdf',
                    'file_size_bytes' => 4314219,
                    'mime_type' => 'application/pdf',
                    'language' => 'en',
                    'status' => 'verified',
                    'confidence_score' => 99.0,
                    'extracted_metadata' => [
                        'bl_number' => 'YS26100022-1',
                        'vessel_voyage' => 'SITC SHENZHEN V.2610S',
                        'port_of_loading' => 'Shanghai, China',
                        'port_of_discharge' => 'Sihanoukville, Cambodia',
                        'container_number' => 'MSCU-889912-1',
                        'seal_number' => 'SL-77218',
                        'shipper' => 'Ningbo Garment Machinery Equipment Co., Ltd',
                        'consignee' => 'Xin Cai Fu Garments (Cambodia) Co., Ltd',
                    ],
                    'notes' => 'Telex release House Bill of Lading attached to main ocean voyage leg.',
                    'created_by_user_id' => $owner->id,
                    'verified_by_user_id' => $owner->id,
                    'verified_at' => now(),
                ]);

                // ------------------------------------------------------------
                // 11. Trade & Customs Clearance Management (v0.6)
                // ------------------------------------------------------------
                $cdcList = $org->cdcMasterLists()->firstOrCreate(
                    ['qip_number' => '211-26'],
                    [
                        'company_name' => 'Xin Cai Fu Garments (Cambodia) Co., Ltd',
                        'tin_number' => 'K008-902100412',
                        'approval_reference' => 'CDC/CRDB/2026/0488',
                        'effective_year' => 2026,
                        'status' => 'active',
                        'valid_from' => '2026-01-15',
                        'valid_until' => '2026-12-31',
                        'notes' => 'Duty-free import exemption master list for Qualified Investment Project (QIP) apparel production equipment and raw materials.',
                    ]
                );

                if ($cdcList->wasRecentlyCreated || $cdcList->items()->count() === 0) {
                    $item1 = $cdcList->items()->create([
                        'organization_id' => $org->id,
                        'category' => 'machinery_equipment',
                        'item_number' => 1,
                        'description_original' => '工业缝纫机 (Lockstitch Industrial Sewing Machine)',
                        'description_english' => 'Single needle lockstitch industrial sewing machine',
                        'hs_code' => '8452.29.00',
                        'model_specification' => 'DDK-8700D',
                        'unit_of_measure' => 'SETS',
                        'approved_quantity' => 120.000,
                        'consumed_quantity' => 40.000,
                        'remaining_quantity' => 80.000,
                        'unit_price_usd' => 650.00,
                        'total_price_usd' => 78000.00,
                        'remarks' => 'Production line assembly A',
                    ]);

                    $item2 = $cdcList->items()->create([
                        'organization_id' => $org->id,
                        'category' => 'machinery_equipment',
                        'item_number' => 2,
                        'description_original' => '布料裁床与激光裁剪机',
                        'description_english' => 'Computerized automatic fabric cutting table and laser cutter',
                        'hs_code' => '8451.50.00',
                        'model_specification' => 'FX-2500-CNC',
                        'unit_of_measure' => 'SETS',
                        'approved_quantity' => 6.000,
                        'consumed_quantity' => 1.000,
                        'remaining_quantity' => 5.000,
                        'unit_price_usd' => 12500.00,
                        'total_price_usd' => 75000.00,
                        'remarks' => 'Cutting department heavy machinery',
                    ]);

                    $cdcList->items()->create([
                        'organization_id' => $org->id,
                        'category' => 'accessories',
                        'item_number' => 3,
                        'description_original' => '金属拉链与拉头 (Metal & Nylon Zippers)',
                        'description_english' => 'Assorted nylon coil and metal garment zippers',
                        'hs_code' => '9607.11.00',
                        'model_specification' => '#5 Brass Closed End 20cm',
                        'unit_of_measure' => 'PCS',
                        'approved_quantity' => 500000.000,
                        'consumed_quantity' => 50000.000,
                        'remaining_quantity' => 450000.000,
                        'unit_price_usd' => 0.18,
                        'total_price_usd' => 90000.00,
                        'remarks' => 'Order garment trims and fastenings',
                    ]);

                    $cdcList->items()->create([
                        'organization_id' => $org->id,
                        'category' => 'raw_materials',
                        'item_number' => 4,
                        'description_original' => '100% 涤纶针织面料 (100% Polyester Knit Fabric)',
                        'description_english' => 'Knitted polyester athletic wear fabric rolls',
                        'hs_code' => '6006.32.00',
                        'model_specification' => '75D/72F Interlock',
                        'unit_of_measure' => 'YDS',
                        'approved_quantity' => 350000.000,
                        'consumed_quantity' => 42000.000,
                        'remaining_quantity' => 308000.000,
                        'unit_price_usd' => 3.80,
                        'total_price_usd' => 1330000.00,
                        'remarks' => 'Main body knit fabric',
                    ]);

                    $cdcList->items()->create([
                        'organization_id' => $org->id,
                        'category' => 'raw_materials',
                        'item_number' => 5,
                        'description_original' => '高弹力缝纫线 (High Tenacity Sewing Thread)',
                        'description_english' => 'High tenacity polyester sewing thread spools',
                        'hs_code' => '5401.10.00',
                        'model_specification' => '40s/2 Spun Poly 5000m',
                        'unit_of_measure' => 'CONES',
                        'approved_quantity' => 80000.000,
                        'consumed_quantity' => 8500.000,
                        'remaining_quantity' => 71500.000,
                        'unit_price_usd' => 1.25,
                        'total_price_usd' => 100000.00,
                        'remarks' => 'Industrial sewing spool supplies',
                    ]);

                    $cdcList->items()->create([
                        'organization_id' => $org->id,
                        'category' => 'machinery_equipment',
                        'item_number' => 6,
                        'description_original' => '仓储重型货架 (Heavy Duty Pallet Racking)',
                        'description_english' => 'Heavy duty warehouse storage pallet racking frame',
                        'hs_code' => '7308.90.99',
                        'model_specification' => 'Rack-HD-4000',
                        'unit_of_measure' => 'SETS',
                        'approved_quantity' => 500.000,
                        'consumed_quantity' => 120.000,
                        'remaining_quantity' => 380.000,
                        'unit_price_usd' => 145.00,
                        'total_price_usd' => 72500.00,
                        'remarks' => 'Finished goods warehouse storage racking',
                    ]);
                } else {
                    $item1 = $cdcList->items()->where('item_number', 1)->first();
                    $item2 = $cdcList->items()->where('item_number', 2)->first();
                }

                // ASYCUDA SAD Declaration 1: Sihanoukville Port (KHKAS) linked to Shipment 1 (SHP-2026-001)
                $dec1 = $org->customsDeclarations()->firstOrCreate(
                    ['declaration_number' => 'SAD-KHKAS-2026-004821'],
                    [
                        'declaration_date' => '2026-10-24',
                        'declaration_type' => 'import',
                        'customs_office_code' => 'KHKAS',
                        'regime_code' => 'IM 4',
                        'inspection_lane' => 'yellow',
                        'status' => 'assessed',
                        'shipment_id' => $shipment1->id,
                        'cdc_master_list_id' => $cdcList->id,
                        'declarant_partner_id' => $brokerCustoms->id,
                        'consignee_partner_id' => $customerGarments->id,
                        'invoice_number' => '26TKYM164',
                        'bill_of_lading_number' => 'YS26100022-1',
                        'total_packages' => 148,
                        'total_gross_weight_kg' => 14250.000,
                        'total_net_weight_kg' => 13500.000,
                        'customs_value_usd' => 38500.00,
                        'duty_exemption_amount_usd' => 2695.00,
                        'payable_duty_usd' => 0.00,
                        'payable_vat_usd' => 0.00,
                        'notes' => 'ASYCUDA SAD lodged under QIP 211-26 exemption. Document check passed, Yellow lane documentary inspection pending final release.',
                        'created_by_user_id' => $owner->id,
                    ]
                );

                if ($dec1->wasRecentlyCreated || $dec1->items()->count() === 0) {
                    $dec1->items()->create([
                        'organization_id' => $org->id,
                        'cdc_master_item_id' => $item1?->id,
                        'item_number' => 1,
                        'hs_code' => '8452.29.00',
                        'description' => 'Single needle lockstitch industrial sewing machine',
                        'quantity' => 40.000,
                        'unit_of_measure' => 'SETS',
                        'gross_weight_kg' => 4800.000,
                        'net_weight_kg' => 4500.000,
                        'customs_value_usd' => 26000.00,
                        'duty_rate_percent' => 7.00,
                        'is_duty_exempt' => true,
                        'exempt_amount_usd' => 1820.00,
                        'notes' => 'QIP item #1 quota cut-stock',
                    ]);

                    $dec1->items()->create([
                        'organization_id' => $org->id,
                        'cdc_master_item_id' => $item2?->id,
                        'item_number' => 2,
                        'hs_code' => '8451.50.00',
                        'description' => 'Computerized automatic fabric cutting table and laser cutter',
                        'quantity' => 1.000,
                        'unit_of_measure' => 'SETS',
                        'gross_weight_kg' => 9450.000,
                        'net_weight_kg' => 9000.000,
                        'customs_value_usd' => 12500.00,
                        'duty_rate_percent' => 7.00,
                        'is_duty_exempt' => true,
                        'exempt_amount_usd' => 875.00,
                        'notes' => 'QIP item #2 quota cut-stock',
                    ]);

                    if ($item1) {
                        $dec1->deductions()->create([
                            'organization_id' => $org->id,
                            'cdc_master_item_id' => $item1->id,
                            'deduction_reference' => 'CUT-2026-XCF-001',
                            'deducted_quantity' => 40.000,
                            'balance_before' => 120.000,
                            'balance_after' => 80.000,
                            'deducted_at' => now()->subDays(3),
                            'created_by_user_id' => $owner->id,
                            'notes' => 'Import quota deduction for shipment SH-2026-0001',
                        ]);
                    }

                    if ($item2) {
                        $dec1->deductions()->create([
                            'organization_id' => $org->id,
                            'cdc_master_item_id' => $item2->id,
                            'deduction_reference' => 'CUT-2026-XCF-002',
                            'deducted_quantity' => 1.000,
                            'balance_before' => 6.000,
                            'balance_after' => 5.000,
                            'deducted_at' => now()->subDays(3),
                            'created_by_user_id' => $owner->id,
                            'notes' => 'Import quota deduction for shipment SH-2026-0001',
                        ]);
                    }
                }

                // ASYCUDA SAD Declaration 2: Phnom Penh Port (KHPNH) linked to Shipment 2 (SH-2026-0002) - Cleared
                $dec2 = $org->customsDeclarations()->firstOrCreate(
                    ['declaration_number' => 'SAD-KHPNH-2026-001902'],
                    [
                        'declaration_date' => '2026-10-20',
                        'declaration_type' => 'import',
                        'customs_office_code' => 'KHPNH',
                        'regime_code' => 'IM 4',
                        'inspection_lane' => 'green',
                        'status' => 'cleared',
                        'shipment_id' => $shipment2->id,
                        'declarant_partner_id' => $brokerCustoms->id,
                        'consignee_partner_id' => $customerGarments->id,
                        'invoice_number' => 'INV-2026-PP-99',
                        'bill_of_lading_number' => 'OOCL-KH-99214',
                        'total_packages' => 320,
                        'total_gross_weight_kg' => 8400.000,
                        'total_net_weight_kg' => 8100.000,
                        'customs_value_usd' => 54000.00,
                        'duty_exemption_amount_usd' => 3780.00,
                        'payable_duty_usd' => 0.00,
                        'payable_vat_usd' => 0.00,
                        'cleared_at' => now()->subDays(2),
                        'released_at' => now()->subDays(1),
                        'notes' => 'Green lane auto-clearance. All goods cleared and released through Phnom Penh dry port.',
                        'created_by_user_id' => $owner->id,
                    ]
                );

                if ($dec2->wasRecentlyCreated || $dec2->items()->count() === 0) {
                    $dec2->items()->create([
                        'organization_id' => $org->id,
                        'item_number' => 1,
                        'hs_code' => '6006.32.00',
                        'description' => '100% Polyester Knitted Fabric for Sportswear',
                        'quantity' => 14200.000,
                        'unit_of_measure' => 'YDS',
                        'gross_weight_kg' => 8400.000,
                        'net_weight_kg' => 8100.000,
                        'customs_value_usd' => 54000.00,
                        'duty_rate_percent' => 7.00,
                        'is_duty_exempt' => true,
                        'exempt_amount_usd' => 3780.00,
                        'notes' => 'Duty exemption granted under general manufacturing incentive.',
                    ]);
                }
            }
        });
    }
}
