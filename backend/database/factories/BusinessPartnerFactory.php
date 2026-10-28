<?php

namespace Database\Factories;

use App\Modules\Partners\BusinessPartner;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<BusinessPartner> */
class BusinessPartnerFactory extends Factory
{
    protected $model = BusinessPartner::class;

    public function definition(): array
    {
        return ['name' => fake()->company(), 'roles' => ['customer'], 'country_code' => 'KH'];
    }
}
