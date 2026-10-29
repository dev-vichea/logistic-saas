<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. CDC Master Lists (QIP Duty Exemption Master)
        Schema::create('cdc_master_lists', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('qip_number', 80); // e.g. QIP # 211-26
            $t->string('company_name', 255);
            $t->string('tin_number', 80)->nullable(); // e.g. L001-902303477
            $t->string('approval_reference', 100);
            $t->smallInteger('effective_year')->default(2026);
            $t->date('valid_from')->nullable();
            $t->date('valid_until')->nullable();
            $t->string('status', 30)->default('active'); // active, expired, suspended
            $t->text('notes')->nullable();
            $t->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'qip_number', 'effective_year']);
            $t->index(['organization_id', 'status', 'id']);
        });

        // 2. CDC Master Items (Approved Duty-Free Quotas)
        Schema::create('cdc_master_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('cdc_master_list_id');
            $t->foreign(['organization_id', 'cdc_master_list_id'])->references(['organization_id', 'id'])->on('cdc_master_lists')->cascadeOnDelete();
            $t->string('category', 50)->default('raw_materials'); // machinery, raw_materials
            $t->integer('item_number')->default(1);
            $t->text('description_original')->nullable();
            $t->text('description_english');
            $t->string('hs_code', 30)->nullable();
            $t->string('model_specification', 255)->nullable();
            $t->string('unit_of_measure', 30)->default('PCS');
            $t->decimal('approved_quantity', 14, 3);
            $t->decimal('consumed_quantity', 14, 3)->default(0.000);
            $t->decimal('remaining_quantity', 14, 3);
            $t->decimal('unit_price_usd', 12, 2)->default(0.00);
            $t->decimal('total_price_usd', 14, 2)->default(0.00);
            $t->text('remarks')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'cdc_master_list_id', 'item_number']);
            $t->index(['organization_id', 'hs_code']);
        });

        // 3. ASYCUDA Customs Declarations
        Schema::create('customs_declarations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('shipment_id')->nullable();
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->nullOnDelete();
            $t->unsignedBigInteger('cdc_master_list_id')->nullable();
            $t->foreign(['organization_id', 'cdc_master_list_id'])->references(['organization_id', 'id'])->on('cdc_master_lists')->nullOnDelete();
            $t->string('declaration_number', 80); // e.g. SAD-KHKAS-2026-004821
            $t->date('declaration_date');
            $t->string('declaration_type', 30)->default('import'); // import, export, transit
            $t->string('customs_office_code', 30)->default('KHKAS'); // KHKAS, KHPNH, KHBAT, KHPOI, OTHER
            $t->string('regime_code', 30)->default('IM 4'); // IM 4, IM 7, EX 1, IM 8
            $t->string('status', 30)->default('draft'); // draft, cdc_deducted, lodged, under_inspection, cleared, released, rejected
            $t->string('inspection_lane', 20)->default('green'); // green, blue, yellow, red
            $t->unsignedBigInteger('declarant_partner_id')->nullable();
            $t->foreign(['organization_id', 'declarant_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->unsignedBigInteger('consignee_partner_id')->nullable();
            $t->foreign(['organization_id', 'consignee_partner_id'])->references(['organization_id', 'id'])->on('business_partners')->nullOnDelete();
            $t->string('invoice_number', 80)->nullable();
            $t->string('bill_of_lading_number', 80)->nullable();
            $t->integer('total_packages')->default(0);
            $t->decimal('total_gross_weight_kg', 12, 3)->default(0.000);
            $t->decimal('total_net_weight_kg', 12, 3)->default(0.000);
            $t->decimal('customs_value_usd', 14, 2)->default(0.00);
            $t->decimal('duty_exemption_amount_usd', 14, 2)->default(0.00);
            $t->decimal('payable_duty_usd', 14, 2)->default(0.00);
            $t->decimal('payable_vat_usd', 14, 2)->default(0.00);
            $t->timestamp('cleared_at')->nullable();
            $t->timestamp('released_at')->nullable();
            $t->text('notes')->nullable();
            $t->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->unique(['organization_id', 'declaration_number']);
            $t->index(['organization_id', 'status', 'id']);
            $t->index(['organization_id', 'inspection_lane']);
            $t->index(['organization_id', 'shipment_id']);
        });

        // 4. Customs Declaration Items
        Schema::create('customs_declaration_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('customs_declaration_id');
            $t->foreign(['organization_id', 'customs_declaration_id'])->references(['organization_id', 'id'])->on('customs_declarations')->cascadeOnDelete();
            $t->unsignedBigInteger('cdc_master_item_id')->nullable();
            $t->foreign(['organization_id', 'cdc_master_item_id'])->references(['organization_id', 'id'])->on('cdc_master_items')->nullOnDelete();
            $t->integer('item_number')->default(1);
            $t->string('hs_code', 30);
            $t->text('description');
            $t->decimal('quantity', 12, 3);
            $t->string('unit_of_measure', 30)->default('PCS');
            $t->decimal('gross_weight_kg', 12, 3)->default(0.000);
            $t->decimal('net_weight_kg', 12, 3)->default(0.000);
            $t->decimal('customs_value_usd', 14, 2)->default(0.00);
            $t->decimal('duty_rate_percent', 6, 2)->default(0.00);
            $t->boolean('is_duty_exempt')->default(true);
            $t->decimal('exempt_amount_usd', 14, 2)->default(0.00);
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->unique(['organization_id', 'id']);
            $t->index(['organization_id', 'customs_declaration_id', 'item_number'], 'idx_cdi_org_decl_item');
        });

        // 5. CDC Quota Deduction Log (Cut Stock Ledger)
        Schema::create('cdc_quota_deductions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('cdc_master_item_id');
            $t->foreign(['organization_id', 'cdc_master_item_id'])->references(['organization_id', 'id'])->on('cdc_master_items')->cascadeOnDelete();
            $t->unsignedBigInteger('customs_declaration_id')->nullable();
            $t->foreign(['organization_id', 'customs_declaration_id'])->references(['organization_id', 'id'])->on('customs_declarations')->cascadeOnDelete();
            $t->unsignedBigInteger('customs_declaration_item_id')->nullable();
            $t->foreign(['organization_id', 'customs_declaration_item_id'])->references(['organization_id', 'id'])->on('customs_declaration_items')->nullOnDelete();
            $t->unsignedBigInteger('shipment_id')->nullable();
            $t->foreign(['organization_id', 'shipment_id'])->references(['organization_id', 'id'])->on('shipments')->nullOnDelete();
            $t->string('deduction_reference', 80); // e.g. CUT-2026-XCF-001
            $t->decimal('deducted_quantity', 14, 3);
            $t->decimal('balance_before', 14, 3);
            $t->decimal('balance_after', 14, 3);
            $t->timestamp('deducted_at');
            $t->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->index(['organization_id', 'cdc_master_item_id']);
            $t->index(['organization_id', 'customs_declaration_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cdc_quota_deductions');
        Schema::dropIfExists('customs_declaration_items');
        Schema::dropIfExists('customs_declarations');
        Schema::dropIfExists('cdc_master_items');
        Schema::dropIfExists('cdc_master_lists');
    }
};
