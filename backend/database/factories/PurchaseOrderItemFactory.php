<?php

namespace Database\Factories;

use App\Modules\PurchaseOrders\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrderItem>
 */
class PurchaseOrderItemFactory extends Factory
{
    protected $model = PurchaseOrderItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return ['description' => fake()->words(2, true), 'quantity' => 1, 'unit' => 'PCS', 'unit_price' => 1];
    }
}
