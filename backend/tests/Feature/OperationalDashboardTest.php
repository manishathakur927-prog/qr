<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\Branch;
use App\Models\DiningTable;
use App\Models\GuestSession;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Restaurant;
use App\Models\TableSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationalDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_orders_and_bills_for_a_branch(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'A1',
            'capacity' => 4,
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

        $guestSession = GuestSession::create([
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'guest_token' => 'guest_customer_record_' . $table->id,
            'status' => 'active',
            'started_at' => now(),
        ]);

        $order = Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'guest_session_id' => $guestSession->id,
            'table_id' => $table->id,
            'status' => 'submitted',
            'idempotency_key' => 'ops-order-1',
            'total_amount' => 250,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 250,
            'notes' => 'No onions',
        ]);

        $bill = Bill::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'table_session_id' => $session->id,
            'order_id' => $order->id,
            'total_amount' => 250,
            'paid_amount' => 0,
            'status' => 'pending',
            'payment_method' => 'cash',
        ]);

        $ordersResponse = $this->actingAs($owner)
            ->getJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/orders');

        $ordersResponse->assertStatus(200)
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.status', 'submitted')
            ->assertJsonPath('data.0.customer', 'Guest #' . $guestSession->id);

        $billsResponse = $this->actingAs($owner)
            ->getJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/bills');

        $billsResponse->assertStatus(200)
            ->assertJsonPath('data.0.id', $bill->id)
            ->assertJsonPath('data.0.status', 'pending');
    }
}
