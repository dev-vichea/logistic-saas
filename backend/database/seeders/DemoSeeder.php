<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Organizations\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo data is only available in local and testing environments.');
        }
        DB::transaction(function () {
            $owner = User::firstOrCreate(['email' => 'dara@mekong.test'], ['name' => 'Dara Sok', 'password' => 'MekongDemo2026!', 'email_verified_at' => now()]);
            foreach (['Mekong Freight Co.', 'Angkor Express'] as $index => $name) {
                $org = Organization::firstOrCreate(['name' => $name], ['legal_name' => $name.' Ltd.', 'email' => 'hello@mekong.test', 'phone' => '+855 23 456 789', 'city' => 'Phnom Penh', 'address' => 'No. 28, Street 2004, Sen Sok, Phnom Penh', 'country_code' => 'KH', 'currency' => 'USD', 'timezone' => 'Asia/Phnom_Penh', 'activities' => $index ? ['last_mile'] : ['road_transport', 'freight_forwarding', 'customs_brokerage']]);
                $org->memberships()->firstOrCreate(['user_id' => $owner->id], ['role' => 'owner']);
                if ($index) {
                    continue;
                }
                foreach (['Operations', 'Customer Success', 'Finance'] as $department) {
                    $org->departments()->firstOrCreate(['name' => $department], ['description' => 'Our '.$department.' team.']);
                }
                foreach (['Sophea Chan' => 'admin', 'Vichea Lim' => 'manager', 'Sreyneang Kim' => 'member'] as $name => $role) {
                    $person = User::firstOrCreate(['email' => str_replace(' ', '.', strtolower($name)).'@mekong.test'], ['name' => $name, 'password' => bin2hex(random_bytes(32)), 'email_verified_at' => now()]);
                    $org->memberships()->firstOrCreate(['user_id' => $person->id], ['role' => $role, 'department_id' => $org->departments()->first()->id]);
                }
                $org->audits()->firstOrCreate(['action' => 'organization.created'], ['actor_id' => $owner->id, 'metadata' => [], 'created_at' => now()]);
            }
        });
    }
}
