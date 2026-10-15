<?php

namespace Tests\Feature;

use App\Models\Restaurant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_role_for_restaurant(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/roles', [
            'name' => 'Manager',
            'slug' => 'manager',
            'description' => 'Branch manager',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Manager');

        $this->assertDatabaseHas('roles', ['restaurant_id' => $restaurant->id, 'slug' => 'manager']);
    }

    public function test_non_owner_cannot_create_role_for_restaurant(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($otherUser)->postJson('/api/v1/restaurants/' . $restaurant->id . '/roles', [
            'name' => 'Chef',
            'slug' => 'chef',
            'description' => 'Kitchen staff',
        ]);

        $response->assertStatus(403);
    }

    public function test_owner_can_assign_a_membership_to_staff_user(): void
    {
        $owner = User::factory()->create();
        $staff = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $role = Role::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Cashier',
            'slug' => 'cashier',
        ]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/memberships', [
            'user_id' => $staff->id,
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.user_id', $staff->id);

        $this->assertDatabaseHas('memberships', [
            'restaurant_id' => $restaurant->id,
            'user_id' => $staff->id,
            'role_id' => $role->id,
            'status' => 'active',
        ]);
    }

    public function test_manager_role_can_manage_restaurant_memberships(): void
    {
        $owner = User::factory()->create();
        $manager = User::factory()->create();
        $staff = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $managerRole = Role::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Manager',
            'slug' => 'manager',
        ]);

        $restaurant->memberships()->create([
            'user_id' => $manager->id,
            'role_id' => $managerRole->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($manager)->postJson('/api/v1/restaurants/' . $restaurant->id . '/memberships', [
            'user_id' => $staff->id,
            'role_id' => $managerRole->id,
            'status' => 'active',
        ]);

        $response->assertStatus(201);
    }

    public function test_owner_can_list_memberships_for_restaurant(): void
    {
        $owner = User::factory()->create();
        $staff = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $role = Role::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Cashier',
            'slug' => 'cashier',
        ]);

        $restaurant->memberships()->create([
            'user_id' => $staff->id,
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($owner)->getJson('/api/v1/restaurants/' . $restaurant->id . '/memberships');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.user.id', $staff->id)
            ->assertJsonPath('data.0.role.name', 'Cashier');
    }
}
