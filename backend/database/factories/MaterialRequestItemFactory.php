<?php

namespace Database\Factories;

use App\Modules\MaterialRequests\MaterialRequestItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaterialRequestItem>
 */
class MaterialRequestItemFactory extends Factory
{
    protected $model = MaterialRequestItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'description' => fake()->words(3, true),
            'quantity' => fake()->numberBetween(1, 1000),
            'unit' => 'PCS',
        ];
    }
}
