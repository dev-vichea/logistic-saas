<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_request_items', function (Blueprint $table) {
            $table->unique(['organization_id', 'material_request_id', 'id'], 'material_request_items_source_unique');
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('purchase_order_id');
            $table->foreign(['organization_id', 'purchase_order_id'])->references(['organization_id', 'id'])->on('purchase_orders')->cascadeOnDelete();
            $table->unsignedBigInteger('material_request_id');
            $table->unsignedBigInteger('material_request_item_id');
            $table->foreign(['organization_id', 'material_request_id', 'material_request_item_id'], 'purchase_order_items_source_fk')
                ->references(['organization_id', 'material_request_id', 'id'])->on('material_request_items')->restrictOnDelete();
            $table->unsignedInteger('line_number');
            $table->string('description', 250);
            $table->string('specification', 250)->nullable();
            $table->decimal('quantity', 14, 3);
            $table->string('unit', 20);
            $table->decimal('unit_price', 14, 2);
            $table->timestamps();
            $table->unique(['organization_id', 'purchase_order_id', 'line_number'], 'purchase_order_line_unique');
            $table->unique(['organization_id', 'purchase_order_id', 'material_request_item_id'], 'purchase_order_source_unique');
        });

        DB::statement('ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_quantity_positive CHECK (quantity > 0)');
        DB::statement('ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_price_nonnegative CHECK (unit_price >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::table('material_request_items', function (Blueprint $table) {
            $table->dropUnique('material_request_items_source_unique');
        });
    }
};
