<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Restaurant;
use Illuminate\Http\Request;

class KitchenOrderController extends Controller
{
    public function index(Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        abort_unless(request()->user()->canManageRestaurantOrders($restaurant), 403, 'You are not allowed to view orders for this restaurant.');

        $orders = Order::whereIn('branch_id', $restaurant->branches()->select('id'))
            ->with(['items.menuItem', 'guestSession:id,name,contact_number'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $orders->map(function (Order $order) {
                $customerLabel = $order->guest_session_id
                    ? ($order->guestSession?->name ?: 'Guest #' . $order->guest_session_id)
                    : 'Table ' . ($order->table_id ?? 'N/A');

                return [
                    'id' => $order->id,
                    'table' => 'T-' . ($order->table_id ?? 'N/A'),
                    'customer' => $customerLabel,
                    'customer_id' => $order->guest_session_id ?? $order->table_id,
                    'guest_session_id' => $order->guest_session_id,
                    'guest_name' => $order->guestSession?->name,
                    'guest_contact_number' => $order->guestSession?->contact_number,
                    'time' => $order->created_at?->format('h:i A'),
                    'items' => $order->items
                        ->map(fn ($item) => $item->menuItem?->name ?? 'Menu item')
                        ->values()
                        ->all(),
                    'total' => (float) $order->total_amount,
                    'status' => $order->status ?? 'submitted',
                ];
            })->all(),
        ]);
    }

    public function updateStatus(Request $request, Restaurant $restaurant, Branch $branch, Order $order)
    {
        if ($restaurant->id !== $branch->restaurant_id || ! $restaurant->branches()->whereKey($order->branch_id)->exists()) {
            abort(403, 'Order does not belong to this restaurant.');
        }

        abort_unless($request->user()->canManageRestaurantOrders($restaurant), 403, 'You are not allowed to update orders for this restaurant.');

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:submitted,preparing,ready,served,cancelled'],
        ]);

        $allowedTransitions = [
            'submitted' => ['preparing', 'cancelled'],
            'preparing' => ['ready', 'cancelled'],
            'ready' => ['served', 'cancelled'],
            'served' => [],
            'cancelled' => [],
        ];

        if (! in_array($validated['status'], $allowedTransitions[$order->status] ?? [], true)) {
            abort(422, 'Invalid order status transition.');
        }

        $order->status = $validated['status'];
        $order->save();

        return response()->json([
            'data' => [
                'id' => $order->id,
                'status' => $order->status,
            ],
        ]);
    }
}
