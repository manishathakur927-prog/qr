<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Restaurant;
use App\Services\Payment\PaymentGatewayFactory;
use Illuminate\Http\Request;
use InvalidArgumentException;

class BillController extends Controller
{
    public function index(Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        abort_unless(request()->user()->canManageRestaurantOrders($restaurant), 403, 'You are not allowed to view bills for this restaurant.');

        $bills = Bill::with(['order:id,guest_session_id,status', 'order.guestSession:id,name,contact_number'])
            ->whereIn('branch_id', $restaurant->branches()->select('id'))
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $bills->map(function (Bill $bill) {
                return [
                    'id' => $bill->id,
                    'table' => 'T-' . ($bill->table_id ?? 'N/A'),
                    'orderId' => $bill->order_id,
                    'order_status' => $bill->order?->status,
                    'guest_session_id' => $bill->order?->guest_session_id,
                    'guest_name' => $bill->order?->guestSession?->name,
                    'guest_contact_number' => $bill->order?->guestSession?->contact_number,
                    'total' => (float) $bill->total_amount,
                    'paid' => (float) $bill->paid_amount,
                    'status' => $bill->status ?? 'pending',
                    'method' => $bill->payment_method ?? 'cash',
                    'provider' => $bill->payment_provider,
                ];
            })->all(),
        ]);
    }

    public function store(Request $request, Restaurant $restaurant, Branch $branch, Order $order)
    {
        if ($restaurant->id !== $branch->restaurant_id || ! $restaurant->branches()->whereKey($order->branch_id)->exists()) {
            abort(403, 'Order does not belong to this restaurant.');
        }

        abort_unless($request->user()->canManageRestaurantOrders($restaurant), 403, 'You are not allowed to create bills for this restaurant.');

        if (! in_array($order->status, ['ready', 'served'], true)) {
            abort(422, 'Order must be ready before a bill can be created.');
        }

        $bill = Bill::firstOrCreate(
            ['order_id' => $order->id],
            [
                'branch_id' => $branch->id,
                'table_id' => $order->table_id,
                'table_session_id' => $order->table_session_id,
                'order_id' => $order->id,
                'order_status' => $order->status,
                'guest_session_id' => $order->guest_session_id,
                'total_amount' => $order->total_amount,
                'paid_amount' => 0,
                'status' => 'pending',
            ]
        );

        return response()->json([
            'data' => [
                'id' => $bill->id,
                'order_id' => $order->id,
                'guest_name' => $order->guestSession?->name,
                'guest_contact_number' => $order->guestSession?->contact_number,
                'total_amount' => (float) $bill->total_amount,
                'status' => $bill->status,
            ],
        ], 201);
    }

    public function pay(Request $request, Restaurant $restaurant, Branch $branch, Bill $bill)
    {
        if ($restaurant->id !== $branch->restaurant_id || ! $restaurant->branches()->whereKey($bill->branch_id)->exists()) {
            abort(403, 'Bill does not belong to this restaurant.');
        }

        abort_unless($request->user()->canManageRestaurantOrders($restaurant), 403, 'You are not allowed to update bills for this restaurant.');

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'in:cash,card,upi'],
            'provider' => ['nullable', 'string', 'in:cash,mock,razorpay,stripe,cashfree'],
        ]);

        $remaining = max($bill->total_amount - $bill->paid_amount, 0);
        $amount = min((float) $validated['amount'], (float) $remaining);
        $providerName = $validated['provider'] ?? 'cash';

        try {
            $gateway = app(PaymentGatewayFactory::class)->make($providerName);
            $paymentResult = $gateway->charge([
                'bill_id' => $bill->id,
                'amount' => $amount,
                'currency' => 'INR',
                'payment_method' => $validated['payment_method'],
            ]);
        } catch (InvalidArgumentException $exception) {
            abort(422, $exception->getMessage());
        }

        if (($paymentResult['success'] ?? false) !== true) {
            abort(402, 'Payment was not accepted by the provider.');
        }

        $bill->paid_amount = (float) $bill->paid_amount + $amount;
        $bill->payment_method = $validated['payment_method'];
        $bill->payment_provider = $paymentResult['provider'] ?? $providerName;
        $bill->payment_reference = $paymentResult['reference'] ?? null;
        $bill->status = $bill->paid_amount >= $bill->total_amount ? 'paid' : 'partial';
        $bill->save();

        return response()->json([
            'data' => [
                'id' => $bill->id,
                'status' => $bill->status,
                'paid_amount' => (float) $bill->paid_amount,
                'total_amount' => (float) $bill->total_amount,
                'payment_provider' => $bill->payment_provider,
                'payment_reference' => $bill->payment_reference,
            ],
        ]);
    }

    public function reverseCashPayment(Request $request, Restaurant $restaurant, Branch $branch, Bill $bill)
    {
        if ($restaurant->id !== $branch->restaurant_id || ! $restaurant->branches()->whereKey($bill->branch_id)->exists()) {
            abort(403, 'Bill does not belong to this restaurant.');
        }

        abort_unless((int) $request->user()->id === (int) $restaurant->owner_id, 403, 'Only the restaurant owner can undo a payment.');

        if (strtolower((string) $bill->payment_provider) !== 'cash' || (float) $bill->paid_amount <= 0) {
            abort(422, 'Only cash payments recorded by staff can be undone here. Payments through a payment provider must be refunded there.');
        }

        $bill->paid_amount = 0;
        $bill->status = 'pending';
        $bill->payment_method = null;
        $bill->payment_provider = null;
        $bill->payment_reference = null;
        $bill->save();

        return response()->json([
            'data' => [
                'id' => $bill->id,
                'status' => $bill->status,
                'paid_amount' => (float) $bill->paid_amount,
                'total_amount' => (float) $bill->total_amount,
                'payment_method' => null,
                'payment_provider' => null,
            ],
        ]);
    }

    public function verifyPayment(Request $request)
    {
        $validated = $request->validate([
            'bill_id' => ['required', 'integer', 'exists:bills,id'],
            'provider' => ['required', 'string', 'in:razorpay,mock,stripe,cashfree'],
            'payment_id' => ['required', 'string'],
            'order_id' => ['nullable'],
            'signature' => ['nullable', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'in:INR'],
        ]);

        $bill = Bill::findOrFail($validated['bill_id']);

        if ($validated['provider'] === 'razorpay') {
            $secret = config('services.razorpay.key_secret');
            $generatedSignature = hash_hmac('sha256', ($validated['order_id'] ?? '') . '|' . $validated['payment_id'], $secret ?? '');

            if (($validated['signature'] ?? '') !== $generatedSignature) {
                abort(403, 'Invalid Razorpay signature.');
            }
        }

        $amount = min((float) $validated['amount'], (float) max($bill->total_amount - $bill->paid_amount, 0));

        $bill->paid_amount = (float) $bill->paid_amount + $amount;
        $bill->payment_method = $bill->payment_method ?? 'card';
        $bill->payment_provider = $validated['provider'];
        $bill->payment_reference = $validated['payment_id'];
        $bill->status = $bill->paid_amount >= $bill->total_amount ? 'paid' : 'partial';
        $bill->save();

        return response()->json([
            'data' => [
                'id' => $bill->id,
                'status' => $bill->status,
                'paid_amount' => (float) $bill->paid_amount,
                'total_amount' => (float) $bill->total_amount,
                'payment_provider' => $bill->payment_provider,
                'payment_reference' => $bill->payment_reference,
            ],
        ]);
    }
}
