<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('material_request_id');
            $table->foreign(['organization_id', 'material_request_id'])->references(['organization_id', 'id'])->on('material_requests')->restrictOnDelete();
            $table->unsignedBigInteger('supplier_partner_id');
            $table->foreign(['organization_id', 'supplier_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->restrictOnDelete();
            $table->string('supplier_name', 255);
            $table->string('po_number', 40);
            $table->string('status', 20)->default('draft');
            $table->string('currency', 3);
            $table->date('expected_delivery_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();
            $table->unique(['organization_id', 'id']);
            $table->unique(['organization_id', 'po_number']);
            $table->unique(['organization_id', 'material_request_id']);
            $table->index(['organization_id', 'status', 'id']);
        });

        DB::statement("ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_valid CHECK (status IN ('draft', 'issued'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
