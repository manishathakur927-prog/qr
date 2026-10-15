<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\TableSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GuestOrderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_join_active_session_with_valid_pin(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T1',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('1234'),
            'opened_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/guest/join-session', [
            'table_id' => $table->id,
            'pin' => '1234',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.session_id', $session->id);
    }

    public function test_guest_cannot_join_with_wrong_pin(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T2',
            'capacity' => 2,
            'status' => 'active',
        ]);

        TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('4321'),
            'opened_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/guest/join-session', [
            'table_id' => $table->id,
            'pin' => '9999',
        ]);

        $response->assertStatus(403);
    }

    public function test_guest_join_falls_back_to_restaurant_menu_when_branch_menu_is_empty(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id, 'name' => 'Bluebird Table Service']);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $fallbackBranch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T5',
            'capacity' => 2,
            'status' => 'active',
        ]);

        TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('1431'),
            'opened_at' => now(),
        ]);

        MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $fallbackBranch->id,
            'name' => 'Restaurant fallback item',
            'description' => 'Added at restaurant level',
            'price' => 199,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/guest/join-session', [
            'table_id' => $table->id,
            'pin' => '1431',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.menu_items.0.name', 'Restaurant fallback item');
    }

    public function test_guest_can_submit_order_once_with_idempotency_key(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T3',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('1111'),
            'opened_at' => now(),
        ]);

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Burger',
            'description' => 'Classic burger',
            'price' => 250,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/guest/orders', [
            'table_id' => $table->id,
            'session_id' => $session->id,
            'idempotency_key' => 'order-abc-1',
            'items' => [
                [
                    'menu_item_id' => $item->id,
                    'quantity' => 1,
                    'notes' => 'No onion',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_guest_can_fetch_their_table_orders_and_statuses(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T6',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('2020'),
            'opened_at' => now(),
        ]);

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Pizza Slice',
            'description' => 'Fresh slice',
            'price' => 180,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = \App\Models\Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'submitted',
            'idempotency_key' => 'guest-order-history-1',
            'total_amount' => 180,
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 180,
            'notes' => null,
        ]);

        $response = $this->getJson('/api/v1/guest/orders?table_id=' . $table->id . '&session_id=' . $session->id);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'submitted')
            ->assertJsonPath('data.0.id', $order->id);
    }

    public function test_guest_can_cancel_a_submitted_order_before_it_reaches_preparing(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T7',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('2010'),
            'opened_at' => now(),
        ]);

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Sandwich',
            'description' => 'Veg sandwich',
            'price' => 220,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = \App\Models\Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'submitted',
            'idempotency_key' => 'guest-order-cancel-1',
            'total_amount' => 220,
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 220,
            'notes' => null,
        ]);

        $response = $this->deleteJson('/api/v1/guest/orders/' . $order->id, [
            'table_id' => $table->id,
            'session_id' => $session->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_guest_join_returns_hotel_specific_menu_and_active_order_context(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id, 'name' => 'Bluebird Table Service']);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T4',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('1234'),
            'opened_at' => now(),
        ]);

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Classic Burger',
            'description' => 'Classic burger',
            'price' => 249,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = \App\Models\Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'submitted',
            'idempotency_key' => 'guest-order-context',
            'total_amount' => 249,
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 249,
            'notes' => 'No onion',
        ]);

        $response = $this->postJson('/api/v1/guest/join-session', [
            'table_id' => $table->id,
            'pin' => '1234',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.restaurant.name', 'Bluebird Table Service')
            ->assertJsonPath('data.menu_items.0.name', 'Classic Burger')
            ->assertJsonPath('data.current_order.total', 249);
    }

    public function test_guest_can_edit_or_remove_items_before_the_order_is_preparing(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'T8',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('4012'),
            'opened_at' => now(),
        ]);

        $burger = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Burger',
            'description' => 'Classic burger',
            'price' => 250,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $fries = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Fries',
            'description' => 'Crispy fries',
            'price' => 120,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = \App\Models\Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'submitted',
            'idempotency_key' => 'guest-order-edit-1',
            'total_amount' => 370,
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $burger->id,
            'quantity' => 1,
            'unit_price' => 250,
            'notes' => null,
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $fries->id,
            'quantity' => 1,
            'unit_price' => 120,
            'notes' => null,
        ]);

        $response = $this->patchJson('/api/v1/guest/orders/' . $order->id, [
            'table_id' => $table->id,
            'session_id' => $session->id,
            'items' => [
                ['menu_item_id' => $burger->id, 'quantity' => 2],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.total_amount', 500)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonCount(1, 'data.items');

        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'menu_item_id' => $burger->id,
            'quantity' => 2,
        ]);

        $this->assertDatabaseMissing('order_items', [
            'order_id' => $order->id,
            'menu_item_id' => $fries->id,
        ]);
    }

    public function test_database_seeder_creates_demo_guest_menu_and_session(): void
    {
        $this->seed();

        $table = DiningTable::find(4);
        $session = $table?->sessions()->where('status', 'open')->latest('opened_at')->first();

        $this->assertNotNull($table);
        $this->assertNotNull($session);
        $this->assertTrue(Hash::check('1234', $session->guest_pin_hash));

        $this->assertDatabaseHas('menu_items', ['id' => 1, 'name' => 'Classic Burger']);
        $this->assertDatabaseHas('menu_items', ['id' => 2, 'name' => 'Paneer Tikka Bowl']);
        $this->assertDatabaseHas('menu_items', ['id' => 3, 'name' => 'Margherita Pizza']);
        $this->assertDatabaseHas('menu_items', ['id' => 4, 'name' => 'Cold Coffee']);
    }
}
