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

class PaymentVerificationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_razorpay_signature_verification_updates_bill_reference(): void
    {
        config()->set('services.razorpay.key_secret', 'test_secret');

        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'A1',
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
            'description' => 'Burger',
            'price' => 200,
            'currency' => 'INR',
            'status' => 'active',
        ]);

        $order = Order::create([
            'branch_id' => $branch->id,
            'table_session_id' => $session->id,
            'table_id' => $table->id,
            'status' => 'ready',
            'idempotency_key' => 'verify-test-1',
            'total_amount' => 200,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 200,
        ]);

        $bill = Bill::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'table_session_id' => $session->id,
            'order_id' => $order->id,
            'total_amount' => 200,
            'paid_amount' => 0,
            'status' => 'pending',
            'payment_method' => 'card',
        ]);

        $payload = $order->id . '|' . 'pay_123';
        $signature = hash_hmac('sha256', $payload, 'test_secret');

        $response = $this->actingAs($owner)->postJson(
            '/api/v1/payments/verify',
            [
                'bill_id' => $bill->id,
                'provider' => 'razorpay',
                'payment_id' => 'pay_123',
                'order_id' => $order->id,
                'signature' => $signature,
                'amount' => 200,
                'currency' => 'INR',
            ]
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment_reference', 'pay_123');

        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'status' => 'paid',
            'payment_reference' => 'pay_123',
        ]);
    }
}
