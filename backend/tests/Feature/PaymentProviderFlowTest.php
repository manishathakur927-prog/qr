<?php

namespace Tests\Feature;

use App\Models\Bill;
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

class PaymentProviderFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_bill_payment_records_provider_reference_and_status(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'P1',
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
            'name' => 'Pizza',
            'description' => 'Fresh pizza',
            'price' => 400,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'ready',
            'idempotency_key' => 'provider-payment-1',
            'total_amount' => 400,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 400,
            'notes' => null,
        ]);

        $bill = Bill::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'table_session_id' => $session->id,
            'order_id' => $order->id,
            'total_amount' => 400,
            'paid_amount' => 0,
            'status' => 'pending',
            'payment_method' => 'cash',
        ]);

        $response = $this->actingAs($owner)->patchJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/bills/' . $bill->id . '/pay',
            [
                'amount' => 400,
                'payment_method' => 'card',
                'provider' => 'mock',
            ]
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment_provider', 'mock');

        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'status' => 'paid',
            'payment_provider' => 'mock',
        ]);
    }
}
