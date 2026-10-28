<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $t) {
            $t->id();
            $t->string('name', 160);
            $t->string('legal_name', 200)->nullable();
            $t->string('registration_number', 80)->nullable();
            $t->string('tax_number', 80)->nullable();
            $t->string('email', 254)->nullable();
            $t->string('phone', 40)->nullable();
            $t->string('website')->nullable();
            $t->text('address')->nullable();
            $t->string('city', 100)->nullable();
            $t->char('country_code', 2);
            $t->string('timezone', 80);
            $t->char('currency', 3);
            $t->jsonb('activities');
            $t->timestamps();
        });
        Schema::create('departments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('name', 100);
            $t->string('description', 500)->nullable();
            $t->timestamps();
            $t->unique(['organization_id', 'name']);
            $t->unique(['organization_id', 'id']);
        });
        Schema::create('memberships', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete()->index();
            $t->enum('role', ['owner', 'admin', 'manager', 'member', 'viewer']);
            $t->unsignedBigInteger('department_id')->nullable()->index();
            $t->timestamps();
            $t->unique(['organization_id', 'user_id']);
            $t->foreign(['organization_id', 'department_id'])->references(['organization_id', 'id'])->on('departments')->restrictOnDelete();
        });
        Schema::create('invitations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->string('email', 254);
            $t->enum('role', ['admin', 'manager', 'member', 'viewer']);
            $t->unsignedBigInteger('department_id')->nullable()->index();
            $t->foreign(['organization_id', 'department_id'])->references(['organization_id', 'id'])->on('departments')->restrictOnDelete();
            $t->string('token_hash', 64)->unique();
            $t->timestamp('expires_at')->index();
            $t->timestamps();
            $t->unique(['organization_id', 'email']);
        });
        Schema::create('audit_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $t->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete()->index();
            $t->string('action', 100);
            $t->jsonb('metadata');
            $t->timestamp('created_at');
            $t->index(['organization_id', 'created_at', 'id']);
        });
    }

    public function down(): void
    {
        foreach (['audit_events', 'invitations', 'memberships', 'departments', 'organizations'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
