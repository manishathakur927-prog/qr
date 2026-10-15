<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Restaurant;
use App\Models\TableSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KitchenOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_update_order_status_through_kitchen_workflow(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'K1',
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
            'name' => 'Burger',
            'description' => 'Classic burger',
            'price' => 250,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = Order::create([
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'branch_id' => $branch->id,
            'status' => 'submitted',
            'idempotency_key' => 'kitchen-order-1',
            'total_amount' => 250,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 250,
            'notes' => 'Extra cheese',
        ]);

        $response = $this->actingAs($owner)->patchJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/orders/' . $order->id . '/status',
            ['status' => 'preparing']
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'preparing');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'preparing']);

        $readyResponse = $this->actingAs($owner)->patchJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/orders/' . $order->id . '/status',
            ['status' => 'ready']
        );

        $readyResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'ready');
    }
}
