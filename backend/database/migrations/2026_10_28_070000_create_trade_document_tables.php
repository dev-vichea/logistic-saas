<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Trade Documents (Vault & Processing Master)
        Schema::create('trade_documents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id')->nullable();
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->nullOnDelete();
            $t->string('document_number', 80)->nullable();
            $t->string('document_type', 50)->default('commercial_invoice'); // commercial_invoice, packing_list, bill_of_lading, cdc_master_list, delivery_order, customs_declaration, other
            $t->string('file_name', 255);
            $t->string('file_path', 500)->nullable();
            $t->unsignedBigInteger('file_size_bytes')->default(0);
            $t->string('mime_type', 100)->default('application/octet-stream');
            $t->string('language', 30)->default('zh-CN,en');
            $t->string('status', 30)->default('uploaded'); // uploaded, parsing, parsed, reconciled, flagged, verified, error
            $t->decimal('confidence_score', 5, 2)->nullable();
            $t->jsonb('extracted_metadata')->nullable();
            $t->longText('raw_content')->nullable();
            $t->text('notes')->nullable();
            $t->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('verified_at')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'document_type', 'id']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'shipment_id']);
        });

        // 2. Trade Document Line Items
        Schema::create('trade_document_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('trade_document_id');
            $t->foreign(['organization_id', 'trade_document_id'])->references(['organization_id', 'id'])->on('trade_documents')->cascadeOnDelete();
            $t->integer('line_number')->default(1);
            $t->string('item_code', 80)->nullable();
            $t->string('hs_code', 30)->nullable();
            $t->text('description_original')->nullable(); // Original text (e.g. Chinese 工业缝纫机)
            $t->text('description_english'); // English translated / provided description
            $t->decimal('quantity', 12, 3)->default(1);
            $t->string('unit_of_measure', 30)->default('PCS');
            $t->decimal('unit_price', 12, 4)->nullable();
            $t->decimal('total_amount', 14, 2)->nullable();
            $t->integer('package_count')->nullable();
            $t->string('package_type', 50)->nullable();
            $t->decimal('gross_weight_kg', 12, 2)->nullable();
            $t->decimal('net_weight_kg', 12, 2)->nullable();
            $t->decimal('volume_cbm', 12, 3)->nullable();
            $t->string('match_status', 30)->default('unmatched'); // unmatched, matched, discrepancy, manual_override, confirmed
            $t->jsonb('discrepancy_details')->nullable();
            $t->jsonb('raw_metadata')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'trade_document_id', 'line_number']);
            $t->index(['organization_id', 'match_status']);
        });

        // 3. Document Reconciliations (Cross-checking Invoice vs Packing List)
        Schema::create('document_reconciliations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id')->nullable();
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->nullOnDelete();
            $t->unsignedBigInteger('invoice_document_id');
            $t->foreign(['organization_id', 'invoice_document_id'])->references(['organization_id', 'id'])->on('trade_documents')->cascadeOnDelete();
            $t->unsignedBigInteger('packing_list_document_id');
            $t->foreign(['organization_id', 'packing_list_document_id'])->references(['organization_id', 'id'])->on('trade_documents')->cascadeOnDelete();
            $t->string('status', 30)->default('balanced'); // balanced, has_discrepancies, resolved
            $t->integer('total_invoice_items')->default(0);
            $t->integer('total_packing_items')->default(0);
            $t->integer('matched_items_count')->default(0);
            $t->integer('discrepancy_count')->default(0);
            $t->decimal('invoice_total_quantity', 12, 3)->default(0);
            $t->decimal('packing_total_quantity', 12, 3)->default(0);
            $t->decimal('invoice_total_gross_weight', 12, 2)->nullable();
            $t->decimal('packing_total_gross_weight', 12, 2)->nullable();
            $t->jsonb('discrepancies')->nullable();
            $t->jsonb('pairs')->nullable();
            $t->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'shipment_id']);
            $t->index(['organization_id', 'invoice_document_id']);
            $t->index(['organization_id', 'packing_list_document_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_reconciliations');
        Schema::dropIfExists('trade_document_items');
        Schema::dropIfExists('trade_documents');
    }
};
