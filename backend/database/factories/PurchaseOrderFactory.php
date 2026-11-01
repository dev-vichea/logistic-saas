<?php

namespace Database\Factories;

use App\Modules\PurchaseOrders\PurchaseOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrder>
 */
class PurchaseOrderFactory extends Factory
{
    protected $model = PurchaseOrder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return ['po_number' => 'PO-'.fake()->unique()->numerify('########'), 'supplier_name' => fake()->company(), 'currency' => 'USD', 'status' => 'draft'];
    }
}
