<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('record_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('material_request_id')->nullable();
            $table->foreign(['organization_id', 'material_request_id'])->references(['organization_id', 'id'])->on('material_requests')->cascadeOnDelete();
            $table->unsignedBigInteger('purchase_order_id')->nullable();
            $table->foreign(['organization_id', 'purchase_order_id'])->references(['organization_id', 'id'])->on('purchase_orders')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size_bytes');
            $table->timestamps();
            $table->index(['organization_id', 'material_request_id', 'id']);
            $table->index(['organization_id', 'purchase_order_id', 'id']);
        });

        DB::statement('ALTER TABLE record_documents ADD CONSTRAINT record_documents_one_parent CHECK ((material_request_id IS NOT NULL) <> (purchase_order_id IS NOT NULL))');
    }

    public function down(): void
    {
        Schema::dropIfExists('record_documents');
    }
};
