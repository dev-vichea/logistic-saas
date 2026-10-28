<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("CREATE UNIQUE INDEX memberships_single_owner ON memberships (organization_id) WHERE role = 'owner'");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS memberships_single_owner');
    }
};
