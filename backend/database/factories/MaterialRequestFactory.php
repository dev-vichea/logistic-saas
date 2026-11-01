<?php

namespace Database\Factories;

use App\Modules\MaterialRequests\MaterialRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaterialRequest>
 */
class MaterialRequestFactory extends Factory
{
    protected $model = MaterialRequest::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return ['title' => fake()->words(3, true), 'status' => 'draft'];
    }
}
