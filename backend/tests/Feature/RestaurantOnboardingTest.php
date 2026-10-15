<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RestaurantOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_restaurant(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/restaurants', [
            'name' => 'Blue Bowl Cafe',
            'slug' => 'blue-bowl-cafe',
            'currency' => 'INR',
            'timezone' => 'Asia/Kolkata',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Blue Bowl Cafe');

        $this->assertDatabaseHas('restaurants', ['slug' => 'blue-bowl-cafe', 'owner_id' => $user->id]);
    }

    public function test_owner_can_create_branch_for_own_restaurant(): void
    {
        $user = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $user->id]);

        $response = $this->actingAs($user)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches', [
            'name' => 'Main Branch',
            'code' => 'MB1',
            'city' => 'Bengaluru',
            'timezone' => 'Asia/Kolkata',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Main Branch');

        $this->assertDatabaseHas('branches', ['restaurant_id' => $restaurant->id, 'code' => 'MB1']);
    }

    public function test_user_cannot_create_branch_for_other_restaurant(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($otherUser)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches', [
            'name' => 'Bad Branch',
            'code' => 'BAD',
            'city' => 'Delhi',
            'timezone' => 'Asia/Kolkata',
        ]);

        $response->assertStatus(403);
    }
}
