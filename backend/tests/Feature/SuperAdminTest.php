<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Restaurant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_manage_any_restaurant(): void
    {
        $restaurantOwner = User::factory()->create();
        $superAdmin = User::factory()->create([
            'is_super_admin' => true,
        ]);
        $restaurant = Restaurant::factory()->create([
            'owner_id' => $restaurantOwner->id,
        ]);

        $this->assertTrue(Gate::forUser($superAdmin)->allows('manage-restaurant', $restaurant));
        $this->assertTrue(Gate::forUser($superAdmin)->allows('create-role', $restaurant));
        $this->assertTrue(Gate::forUser($superAdmin)->allows('create-membership', $restaurant));
    }

    public function test_super_admin_can_create_and_toggle_restaurant_status(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $this->actingAs($superAdmin);

        $createResponse = $this->postJson('/api/v1/restaurants', [
            'name' => 'Sunset Cafe',
            'slug' => 'sunset-cafe',
            'currency' => 'INR',
            'timezone' => 'Asia/Kolkata',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Sunset Cafe');

        $restaurantId = $createResponse->json('data.id');
        $this->assertDatabaseHas('restaurants', ['id' => $restaurantId, 'status' => 'draft']);

        $toggleResponse = $this->patchJson('/api/v1/restaurants/' . $restaurantId, [
            'status' => 'inactive',
        ]);

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseHas('restaurants', ['id' => $restaurantId, 'status' => 'inactive']);
    }

    public function test_super_admin_can_list_and_assign_subscription_plans(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $restaurantOwner = User::factory()->create();
        $restaurant = Restaurant::factory()->create([
            'owner_id' => $restaurantOwner->id,
            'status' => 'draft',
        ]);

        $this->actingAs($superAdmin);

        $plansResponse = $this->getJson('/api/v1/subscription-plans');

        $plansResponse->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Starter')
            ->assertJsonPath('data.1.slug', 'pro');

        $assignmentResponse = $this->patchJson('/api/v1/restaurants/' . $restaurant->id . '/subscription', [
            'plan_slug' => 'pro',
            'billing_cycle' => 'monthly',
        ]);

        $assignmentResponse->assertStatus(200)
            ->assertJsonPath('data.subscription_plan.slug', 'pro')
            ->assertJsonPath('data.subscription_status', 'active');
    }

    public function test_super_admin_restaurant_list_includes_name_and_table_data(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $restaurantOwner = User::factory()->create();
        $restaurant = Restaurant::factory()->create([
            'owner_id' => $restaurantOwner->id,
            'name' => 'Bluebird Cafe',
            'status' => 'active',
        ]);

        $branch = $restaurant->branches()->create([
            'name' => 'Main Branch',
            'code' => 'MAIN',
            'address' => 'Main hall',
            'city' => 'Jaipur',
            'country' => 'India',
            'timezone' => 'Asia/Kolkata',
            'status' => 'active',
        ]);

        $branch->diningTables()->create([
            'table_number' => 'T-10',
            'name' => 'Window',
            'section' => 'Main hall',
            'capacity' => 4,
            'status' => 'available',
        ]);

        $this->actingAs($superAdmin);

        $response = $this->getJson('/api/v1/restaurants');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Bluebird Cafe')
            ->assertJsonPath('data.0.branches.0.dining_tables.0.table_number', 'T-10');
    }

    public function test_super_admin_can_create_update_and_delete_subscription_plan(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $this->actingAs($superAdmin);

        $createResponse = $this->postJson('/api/v1/subscription-plans', [
            'name' => 'Growth',
            'slug' => 'growth',
            'price_monthly' => 1499,
            'price_annual' => 14990,
            'max_tables' => 30,
            'features' => ['30 tables', 'Analytics'],
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Growth')
            ->assertJsonPath('data.slug', 'growth');

        $planId = $createResponse->json('data.id');

        $updateResponse = $this->patchJson('/api/v1/subscription-plans/' . $planId, [
            'name' => 'Growth Plus',
            'price_monthly' => 1799,
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.name', 'Growth Plus')
            ->assertJsonPath('data.price_monthly', '1799.00');

        $deleteResponse = $this->deleteJson('/api/v1/subscription-plans/' . $planId);

        $deleteResponse->assertStatus(200)
            ->assertJsonPath('message', 'Subscription plan deleted successfully.');

        $this->assertSoftDeleted('subscription_plans', ['id' => $planId]);
    }

    public function test_super_admin_delete_soft_deletes_restaurant(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $restaurantOwner = User::factory()->create();
        $restaurant = Restaurant::factory()->create([
            'owner_id' => $restaurantOwner->id,
            'name' => 'Soft Delete Cafe',
        ]);

        $this->actingAs($superAdmin);

        $response = $this->deleteJson('/api/v1/restaurants/' . $restaurant->id);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Restaurant deleted successfully.');

        $this->assertSoftDeleted('restaurants', ['id' => $restaurant->id]);
    }

    public function test_super_admin_can_login_as_any_restaurant_owner(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $restaurantOwner = User::factory()->create([
            'email' => 'owner@example.com',
            'name' => 'Restaurant Owner',
        ]);

        $restaurant = Restaurant::factory()->create([
            'owner_id' => $restaurantOwner->id,
            'name' => 'Bluebird Cafe',
        ]);

        $this->actingAs($superAdmin);

        $response = $this->postJson('/api/v1/restaurants/' . $restaurant->id . '/impersonate');

        $response->assertStatus(200)
            ->assertJsonPath('restaurant_id', $restaurant->id)
            ->assertJsonPath('user.email', 'owner@example.com')
            ->assertJsonPath('user.is_super_admin', false)
            ->assertJsonPath('restaurant.name', 'Bluebird Cafe');
    }

    public function test_super_admin_login_reports_platform_access(): void
    {
        $superAdmin = User::factory()->create([
            'email' => 'superadmin@example.com',
            'password' => 'password123',
            'is_super_admin' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.is_super_admin', true)
            ->assertJsonPath('user.email', 'superadmin@example.com');
    }

    public function test_branch_admin_role_can_manage_table_qr_tokens(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create([
            'owner_id' => $owner->id,
        ]);

        $branchAdminRole = Role::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Branch Admin',
            'slug' => 'branch-admin',
        ]);

        $permission = Permission::create([
            'name' => 'Manage Table QR Codes',
            'slug' => 'manage-table-qr',
            'resource' => 'tables',
        ]);

        $branchAdminRole->permissions()->attach($permission);

        $branchAdminUser = User::factory()->create();
        $branchAdminUser->memberships()->create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => null,
            'role_id' => $branchAdminRole->id,
            'status' => 'active',
        ]);

        $this->assertTrue(Gate::forUser($branchAdminUser)->allows('manage-table-qr', $restaurant));
    }
}
