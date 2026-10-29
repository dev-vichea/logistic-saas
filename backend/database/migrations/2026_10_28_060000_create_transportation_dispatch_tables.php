<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Vehicles & Fleet Assets
        Schema::create('vehicles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('carrier_partner_id')->nullable();
            $t->foreign(['organization_id', 'carrier_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->string('plate_number', 40);
            $t->enum('type', ['tractor_head', 'rigid_truck', 'container_chassis', 'flatbed_trailer', 'box_truck', 'van', 'other'])->default('rigid_truck');
            $t->enum('ownership_type', ['owned', 'leased', 'subcontracted'])->default('owned');
            $t->string('make_model', 120);
            $t->unsignedSmallInteger('year')->nullable();
            $t->decimal('max_payload_kg', 12, 2)->default(0);
            $t->decimal('volume_capacity_cbm', 10, 3)->nullable();
            $t->string('current_status', 30)->default('available'); // available, dispatched, maintenance, inactive
            $t->boolean('is_active')->default(true);
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'plate_number']);
            $t->index(['organization_id', 'current_status']);
            $t->index(['organization_id', 'type', 'is_active']);
        });

        // 2. Drivers Registry
        Schema::create('drivers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('carrier_partner_id')->nullable();
            $t->foreign(['organization_id', 'carrier_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->string('full_name', 160);
            $t->string('phone', 40);
            $t->string('email', 254)->nullable();
            $t->string('license_number', 60);
            $t->enum('license_type', ['light_truck', 'heavy_truck', 'articulated_trailer', 'hazardous_materials'])->default('heavy_truck');
            $t->date('license_expires_at')->nullable();
            $t->string('current_status', 30)->default('available'); // available, on_trip, rest_leave, inactive
            $t->boolean('is_active')->default(true);
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'license_number']);
            $t->index(['organization_id', 'is_active']);
            $t->index(['organization_id', 'current_status']);
        });

        // 3. Dispatch Trips & Run-Sheets
        Schema::create('dispatch_trips', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('trip_number', 40);
            $t->unsignedBigInteger('carrier_partner_id')->nullable();
            $t->foreign(['organization_id', 'carrier_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('vehicle_id')->nullable();
            $t->foreign(['organization_id', 'vehicle_id'])->references(['organization_id', 'id'])->on('vehicles')->nullOnDelete();
            $t->unsignedBigInteger('trailer_vehicle_id')->nullable();
            $t->foreign(['organization_id', 'trailer_vehicle_id'])->references(['organization_id', 'id'])->on('vehicles')->nullOnDelete();
            $t->unsignedBigInteger('driver_id')->nullable();
            $t->foreign(['organization_id', 'driver_id'])->references(['organization_id', 'id'])->on('drivers')->nullOnDelete();
            $t->unsignedBigInteger('secondary_driver_id')->nullable();
            $t->foreign(['organization_id', 'secondary_driver_id'])->references(['organization_id', 'id'])->on('drivers')->nullOnDelete();
            $t->unsignedBigInteger('origin_location_id');
            $t->foreign(['organization_id', 'origin_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->unsignedBigInteger('destination_location_id');
            $t->foreign(['organization_id', 'destination_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->string('status', 30)->default('draft'); // draft, dispatched, loading, in_transit, unloading, completed, cancelled
            $t->dateTime('scheduled_start_time')->nullable();
            $t->dateTime('actual_start_time')->nullable();
            $t->dateTime('scheduled_end_time')->nullable();
            $t->dateTime('actual_end_time')->nullable();
            $t->decimal('odometer_start_km', 10, 1)->nullable();
            $t->decimal('odometer_end_km', 10, 1)->nullable();
            $t->string('container_number', 40)->nullable();
            $t->string('seal_number', 40)->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'trip_number']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'driver_id']);
            $t->index(['organization_id', 'vehicle_id']);
        });

        // 4. Dispatch Trip Legs (linking trips to shipment legs)
        Schema::create('dispatch_trip_legs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('dispatch_trip_id');
            $t->foreign(['organization_id', 'dispatch_trip_id'])->references(['organization_id', 'id'])->on('dispatch_trips')->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_leg_id');
            $t->foreign(['organization_id', 'shipment_leg_id'])->references(['organization_id', 'id'])->on('shipment_legs')->restrictOnDelete();
            $t->unsignedSmallInteger('sequence')->default(1);
            $t->timestamps();

            $t->unique(['organization_id', 'dispatch_trip_id', 'shipment_leg_id'], 'trip_leg_unique');
            $t->index(['organization_id', 'shipment_leg_id']);
        });

        // 5. Proof of Delivery (POD)
        Schema::create('proof_of_deliveries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('dispatch_trip_id');
            $t->foreign(['organization_id', 'dispatch_trip_id'])->references(['organization_id', 'id'])->on('dispatch_trips')->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id');
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->restrictOnDelete();
            $t->string('recipient_name', 160);
            $t->string('recipient_phone', 40)->nullable();
            $t->dateTime('delivered_at');
            $t->text('signature_svg')->nullable();
            $t->string('photo_url', 500)->nullable();
            $t->unsignedInteger('received_packages')->default(1);
            $t->unsignedInteger('damaged_packages')->default(0);
            $t->text('discrepancy_notes')->nullable();
            $t->text('signatory_remarks')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'dispatch_trip_id', 'shipment_id'], 'trip_shipment_pod_unique');
            $t->index(['organization_id', 'shipment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proof_of_deliveries');
        Schema::dropIfExists('dispatch_trip_legs');
        Schema::dropIfExists('dispatch_trips');
        Schema::dropIfExists('drivers');
        Schema::dropIfExists('vehicles');
    }
};
