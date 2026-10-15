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

class BillingFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_and_settle_bill_for_ready_order(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'B1',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => 'open',
            'opened_by' => $owner->id,
            'guest_pin_hash' => bcrypt('4321'),
            'opened_at' => now(),
        ]);

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => 'Pasta',
            'description' => 'Creamy pasta',
            'price' => 350,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'ready',
            'idempotency_key' => 'bill-order-1',
            'total_amount' => 350,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 350,
            'notes' => null,
        ]);

        $billResponse = $this->actingAs($owner)->postJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/orders/' . $order->id . '/bill'
        );

        $billResponse->assertStatus(201)
            ->assertJsonPath('data.total_amount', 350);

        $billId = $billResponse->json('data.id');

        $paymentResponse = $this->actingAs($owner)->patchJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/bills/' . $billId . '/pay',
            [
                'amount' => 350,
                'payment_method' => 'cash',
                'provider' => 'cash',
            ]
        );

        $paymentResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('bills', ['id' => $billId, 'status' => 'paid']);
    }
}
