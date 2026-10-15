<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_restaurant_and_branch_can_be_created(): void
    {
        $owner = User::factory()->create();

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Blue Bowl Cafe',
            'slug' => 'blue-bowl-cafe',
            'status' => 'active',
            'currency' => 'INR',
            'timezone' => 'Asia/Kolkata',
        ]);

        $branch = Branch::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Main Branch',
            'code' => 'MB1',
            'address' => 'MG Road, Bengaluru',
            'city' => 'Bengaluru',
            'country' => 'India',
            'timezone' => 'Asia/Kolkata',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('restaurants', ['slug' => 'blue-bowl-cafe']);
        $this->assertDatabaseHas('branches', ['code' => 'MB1']);
        $this->assertEquals($restaurant->id, $branch->restaurant_id);
    }
}
