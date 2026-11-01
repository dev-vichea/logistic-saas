<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('request_number', 40);
            $table->string('title', 200);
            $table->date('needed_by')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('draft');
            $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->unique(['organization_id', 'id']);
            $table->unique(['organization_id', 'request_number']);
            $table->index(['organization_id', 'status', 'id']);
        });

        Schema::create('material_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('material_request_id');
            $table->foreign(['organization_id', 'material_request_id'])
                ->references(['organization_id', 'id'])->on('material_requests')->cascadeOnDelete();
            $table->unsignedInteger('line_number');
            $table->string('description', 250);
            $table->string('specification', 250)->nullable();
            $table->decimal('quantity', 14, 3);
            $table->string('unit', 20);
            $table->timestamps();
            $table->unique(['organization_id', 'material_request_id', 'line_number'], 'material_request_line_unique');
            $table->index(['organization_id', 'material_request_id', 'id']);
        });

        DB::statement("ALTER TABLE material_requests ADD CONSTRAINT material_requests_status_valid CHECK (status IN ('draft', 'submitted'))");
        DB::statement('ALTER TABLE material_request_items ADD CONSTRAINT material_request_items_quantity_positive CHECK (quantity > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('material_request_items');
        Schema::dropIfExists('material_requests');
    }
};
