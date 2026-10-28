<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_partners', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('name', 200);
            $t->string('legal_name', 250)->nullable();
            $t->string('code', 40)->nullable();
            $t->jsonb('roles');
            $t->char('country_code', 2);
            $t->string('registration_number', 80)->nullable();
            $t->string('tax_number', 80)->nullable();
            $t->string('email', 254)->nullable();
            $t->string('phone', 40)->nullable();
            $t->string('website')->nullable();
            $t->text('notes')->nullable();
            $t->timestamp('archived_at')->nullable();
            $t->timestamps();
            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'code']);
            $t->index(['organization_id', 'archived_at', 'id']);
            $t->index(['organization_id', 'country_code']);
        });
        DB::statement('CREATE INDEX partners_roles_gin ON business_partners USING GIN (roles)');
        DB::statement('CREATE INDEX partners_name_sort ON business_partners (organization_id, lower(name), id)');
        DB::statement("ALTER TABLE business_partners ADD CONSTRAINT partners_roles_valid CHECK (jsonb_typeof(roles) = 'array' AND jsonb_array_length(roles) BETWEEN 1 AND 8 AND roles <@ '[\"customer\",\"shipper\",\"consignee\",\"supplier\",\"carrier\",\"freight_forwarder\",\"broker\",\"warehouse_operator\"]'::jsonb)");
        Schema::create('partner_contacts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('business_partner_id');
            $t->foreign(['organization_id', 'business_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->cascadeOnDelete();
            $t->string('name', 160);
            $t->string('job_title', 100)->nullable();
            $t->string('email', 254)->nullable();
            $t->string('phone', 40)->nullable();
            $t->text('notes')->nullable();
            $t->boolean('is_primary')->default(false);
            $t->timestamps();
            $t->index(['organization_id', 'business_partner_id', 'id']);
            $t->index('business_partner_id');
        });
        Schema::create('locations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('business_partner_id')->nullable();
            $t->foreign(['organization_id', 'business_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->restrictOnDelete();
            $t->string('name', 160);
            $t->enum('type', ['office', 'warehouse', 'port', 'airport', 'yard', 'delivery_site', 'other']);
            $t->string('address_line_1', 250);
            $t->string('address_line_2', 250)->nullable();
            $t->string('city', 100);
            $t->string('state', 100)->nullable();
            $t->string('postal_code', 20)->nullable();
            $t->char('country_code', 2);
            $t->decimal('latitude', 10, 7)->nullable();
            $t->decimal('longitude', 10, 7)->nullable();
            $t->text('notes')->nullable();
            $t->boolean('is_primary')->default(false);
            $t->timestamps();
            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'business_partner_id', 'id']);
            $t->index('business_partner_id');
        });
        DB::statement('CREATE UNIQUE INDEX contacts_single_primary ON partner_contacts (organization_id,business_partner_id) WHERE is_primary');
        DB::statement('CREATE UNIQUE INDEX locations_single_primary ON locations (organization_id,business_partner_id) WHERE is_primary AND business_partner_id IS NOT NULL');
        DB::statement('ALTER TABLE locations ADD CONSTRAINT locations_coordinates_valid CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))');
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
        Schema::dropIfExists('partner_contacts');
        Schema::dropIfExists('business_partners');
    }
};
