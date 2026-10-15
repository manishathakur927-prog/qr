<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Restaurant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
{
    protected $model = Branch::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'name' => fake()->company(),
            'code' => strtoupper(fake()->bothify('BR##')),
            'address' => fake()->address(),
            'city' => fake()->city(),
            'country' => 'India',
            'timezone' => 'Asia/Kolkata',
            'status' => 'active',
        ];
    }
}
