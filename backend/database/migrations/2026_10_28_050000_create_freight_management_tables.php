<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Freight Requests (Inquiries)
        Schema::create('freight_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('request_number', 40);
            $t->unsignedBigInteger('customer_id');
            $t->foreign(['organization_id', 'customer_id'])->references(['organization_id', 'id'])->on('business_partners')->cascadeOnDelete();
            $t->unsignedBigInteger('shipper_id')->nullable();
            $t->foreign(['organization_id', 'shipper_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('consignee_id')->nullable();
            $t->foreign(['organization_id', 'consignee_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('origin_location_id');
            $t->foreign(['organization_id', 'origin_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->unsignedBigInteger('destination_location_id');
            $t->foreign(['organization_id', 'destination_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->enum('transport_mode', ['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal']);
            $t->string('incoterm', 10)->nullable();
            $t->string('status', 30)->default('draft');
            $t->text('cargo_description')->nullable();
            $t->string('package_type', 50)->nullable();
            $t->integer('total_pieces')->default(0);
            $t->decimal('total_weight_kg', 12, 2)->default(0);
            $t->decimal('total_volume_cbm', 12, 3)->default(0);
            $t->boolean('is_dangerous')->default(false);
            $t->boolean('is_temperature_controlled')->default(false);
            $t->date('target_readiness_date')->nullable();
            $t->date('target_delivery_date')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'request_number']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'customer_id']);
        });

        // 2. Quotations
        Schema::create('quotations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('quotation_number', 40);
            $t->integer('revision')->default(0);
            $t->unsignedBigInteger('freight_request_id')->nullable();
            $t->foreign(['organization_id', 'freight_request_id'])->references(['organization_id', 'id'])->on('freight_requests')->nullOnDelete();
            $t->unsignedBigInteger('customer_id');
            $t->foreign(['organization_id', 'customer_id'])->references(['organization_id', 'id'])->on('business_partners')->cascadeOnDelete();
            $t->unsignedBigInteger('shipper_id')->nullable();
            $t->foreign(['organization_id', 'shipper_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('consignee_id')->nullable();
            $t->foreign(['organization_id', 'consignee_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('origin_location_id');
            $t->foreign(['organization_id', 'origin_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->unsignedBigInteger('destination_location_id');
            $t->foreign(['organization_id', 'destination_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->enum('transport_mode', ['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal']);
            $t->string('incoterm', 10)->nullable();
            $t->char('currency', 3)->default('USD');
            $t->decimal('subtotal_amount', 14, 2)->default(0);
            $t->decimal('tax_amount', 14, 2)->default(0);
            $t->decimal('total_amount', 14, 2)->default(0);
            $t->string('status', 30)->default('draft');
            $t->date('valid_until')->nullable();
            $t->text('terms_and_conditions')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'quotation_number', 'revision']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'customer_id']);
        });

        // 3. Quotation Line Items
        Schema::create('quotation_line_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('quotation_id');
            $t->foreign(['organization_id', 'quotation_id'])->references(['organization_id', 'id'])->on('quotations')->cascadeOnDelete();
            $t->string('description', 250);
            $t->string('charge_type', 50)->default('freight');
            $t->decimal('quantity', 12, 2)->default(1);
            $t->decimal('unit_price', 14, 2)->default(0);
            $t->decimal('total_amount', 14, 2)->default(0);
            $t->char('currency', 3)->default('USD');
            $t->timestamps();

            $t->index(['organization_id', 'quotation_id', 'id']);
        });

        // 4. Bookings (Commercial Orders)
        Schema::create('bookings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('booking_number', 40);
            $t->unsignedBigInteger('quotation_id')->nullable();
            $t->foreign(['organization_id', 'quotation_id'])->references(['organization_id', 'id'])->on('quotations')->nullOnDelete();
            $t->unsignedBigInteger('customer_id');
            $t->foreign(['organization_id', 'customer_id'])->references(['organization_id', 'id'])->on('business_partners')->cascadeOnDelete();
            $t->unsignedBigInteger('shipper_id')->nullable();
            $t->foreign(['organization_id', 'shipper_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('consignee_id')->nullable();
            $t->foreign(['organization_id', 'consignee_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('origin_location_id');
            $t->foreign(['organization_id', 'origin_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->unsignedBigInteger('destination_location_id');
            $t->foreign(['organization_id', 'destination_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->enum('transport_mode', ['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal']);
            $t->string('incoterm', 10)->nullable();
            $t->string('customer_reference', 80)->nullable();
            $t->string('status', 30)->default('draft');
            $t->decimal('total_amount', 14, 2)->default(0);
            $t->char('currency', 3)->default('USD');
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'booking_number']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'customer_id']);
        });

        // 5. Shipments (Operational Master)
        Schema::create('shipments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('shipment_number', 40);
            $t->unsignedBigInteger('booking_id')->nullable();
            $t->foreign(['organization_id', 'booking_id'])->references(['organization_id', 'id'])->on('bookings')->nullOnDelete();
            $t->unsignedBigInteger('customer_id');
            $t->foreign(['organization_id', 'customer_id'])->references(['organization_id', 'id'])->on('business_partners')->cascadeOnDelete();
            $t->unsignedBigInteger('carrier_id')->nullable();
            $t->foreign(['organization_id', 'carrier_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('origin_location_id');
            $t->foreign(['organization_id', 'origin_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->unsignedBigInteger('destination_location_id');
            $t->foreign(['organization_id', 'destination_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->enum('transport_mode', ['road', 'ocean_fcl', 'ocean_lcl', 'air', 'multimodal']);
            $t->string('master_tracking_number', 80)->nullable();
            $t->string('status', 30)->default('draft');
            $t->string('customs_status', 30)->default('not_applicable');
            $t->string('commercial_status', 30)->default('pending');
            $t->dateTime('etd')->nullable();
            $t->dateTime('atd')->nullable();
            $t->dateTime('eta')->nullable();
            $t->dateTime('ata')->nullable();
            $t->text('special_instructions')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'shipment_number']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'customs_status']);
            $t->index(['organization_id', 'customer_id']);
            $t->index(['organization_id', 'carrier_id']);
        });

        // 6. Cargo Items (Packages & Commodities)
        Schema::create('cargo_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id')->nullable();
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->cascadeOnDelete();
            $t->unsignedBigInteger('booking_id')->nullable();
            $t->foreign(['organization_id', 'booking_id'])->references(['organization_id', 'id'])->on('bookings')->cascadeOnDelete();
            $t->string('description', 250);
            $t->string('commodity', 100)->nullable();
            $t->string('hs_code', 20)->nullable();
            $t->string('package_type', 50)->default('cartons');
            $t->integer('quantity')->default(1);
            $t->string('container_number', 50)->nullable();
            $t->string('seal_number', 50)->nullable();
            $t->decimal('length_cm', 10, 2)->nullable();
            $t->decimal('width_cm', 10, 2)->nullable();
            $t->decimal('height_cm', 10, 2)->nullable();
            $t->decimal('gross_weight_kg', 12, 2)->default(0);
            $t->decimal('net_weight_kg', 12, 2)->default(0);
            $t->decimal('volume_cbm', 12, 3)->default(0);
            $t->boolean('is_dangerous')->default(false);
            $t->string('un_number', 10)->nullable();
            $t->boolean('is_temperature_controlled')->default(false);
            $t->decimal('temp_min_celsius', 5, 2)->nullable();
            $t->decimal('temp_max_celsius', 5, 2)->nullable();
            $t->timestamps();

            $t->index(['organization_id', 'shipment_id', 'id']);
            $t->index(['organization_id', 'booking_id', 'id']);
        });

        // 7. Multimodal Transport Legs
        Schema::create('shipment_legs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id');
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->cascadeOnDelete();
            $t->integer('sequence')->default(1);
            $t->enum('leg_type', ['pre_carriage', 'main_carriage', 'on_carriage', 'customs_inspection']);
            $t->enum('transport_mode', ['road', 'ocean', 'air', 'rail']);
            $t->unsignedBigInteger('carrier_id')->nullable();
            $t->foreign(['organization_id', 'carrier_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('origin_location_id');
            $t->foreign(['organization_id', 'origin_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->unsignedBigInteger('destination_location_id');
            $t->foreign(['organization_id', 'destination_location_id'])->references(['organization_id', 'id'])->on('locations')->restrictOnDelete();
            $t->string('vessel_or_flight_or_plate', 100)->nullable();
            $t->string('voyage_or_trip_number', 60)->nullable();
            $t->dateTime('scheduled_departure')->nullable();
            $t->dateTime('actual_departure')->nullable();
            $t->dateTime('scheduled_arrival')->nullable();
            $t->dateTime('actual_arrival')->nullable();
            $t->string('status', 30)->default('scheduled');
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'shipment_id', 'sequence']);
        });

        // 8. Multi-Company Shipment Participants
        Schema::create('shipment_participants', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id');
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->cascadeOnDelete();
            $t->unsignedBigInteger('business_partner_id');
            $t->foreign(['organization_id', 'business_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->cascadeOnDelete();
            $t->unsignedBigInteger('connected_organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $t->enum('role', ['shipper', 'consignee', 'carrier', 'customs_broker', 'forwarder', 'notify_party']);
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'shipment_id', 'business_partner_id', 'role'], 'shipment_participant_unique');
            $t->index(['connected_organization_id', 'role']);
        });

        // 9. Shipment Milestones / Event Timeline
        Schema::create('shipment_milestones', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id');
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_leg_id')->nullable();
            $t->foreign(['organization_id', 'shipment_leg_id'])->references(['organization_id', 'id'])->on('shipment_legs')->nullOnDelete();
            $t->string('code', 50);
            $t->string('title', 160);
            $t->text('description')->nullable();
            $t->string('location_name', 160)->nullable();
            $t->unsignedBigInteger('location_id')->nullable();
            $t->foreign(['organization_id', 'location_id'])->references(['organization_id', 'id'])->on('locations')->nullOnDelete();
            $t->dateTime('occurred_at');
            $t->boolean('is_exception')->default(false);
            $t->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->index(['organization_id', 'shipment_id', 'occurred_at']);
        });

        // DB statements for text search / sort expression indexes
        DB::statement('CREATE INDEX freight_requests_number_sort ON freight_requests (organization_id, lower(request_number), id)');
        DB::statement('CREATE INDEX quotations_number_sort ON quotations (organization_id, lower(quotation_number), id)');
        DB::statement('CREATE INDEX bookings_number_sort ON bookings (organization_id, lower(booking_number), id)');
        DB::statement('CREATE INDEX shipments_number_sort ON shipments (organization_id, lower(shipment_number), id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_milestones');
        Schema::dropIfExists('shipment_participants');
        Schema::dropIfExists('shipment_legs');
        Schema::dropIfExists('cargo_items');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('quotation_line_items');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('freight_requests');
    }
};
