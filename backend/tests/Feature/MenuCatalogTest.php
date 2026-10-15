<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_menu_category_for_restaurant(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/categories', [
            'name' => 'Starters',
            'sort_order' => 1,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Starters');

        $this->assertDatabaseHas('categories', ['restaurant_id' => $restaurant->id, 'name' => 'Starters']);
    }

    public function test_non_owner_cannot_create_menu_category(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $response = $this->actingAs($otherUser)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/categories', [
            'name' => 'Pizza',
            'sort_order' => 3,
        ]);

        $response->assertStatus(403);
    }

    public function test_owner_can_create_menu_item_for_branch(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/items', [
            'name' => 'Margherita Pizza',
            'description' => 'Classic cheese pizza',
            'price' => 299,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Margherita Pizza');

        $this->assertDatabaseHas('menu_items', ['branch_id' => $branch->id, 'name' => 'Margherita Pizza']);
    }
}
