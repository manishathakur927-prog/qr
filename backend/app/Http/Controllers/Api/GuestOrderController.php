<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TableSession;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GuestOrderController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'table_id' => ['required', 'exists:dining_tables,id'],
            'session_id' => ['nullable', 'exists:table_sessions,id'],
            'guest_session_id' => ['nullable', 'exists:guest_sessions,id'],
        ]);

        $guestSession = null;

        if (! empty($validated['guest_session_id'])) {
            $guestSession = \App\Models\GuestSession::with('tableSession')->findOrFail($validated['guest_session_id']);

            if ($guestSession->table_id != $validated['table_id']) {
                abort(403, 'Guest session does not belong to this table.');
            }

            if (! empty($validated['session_id']) && $guestSession->table_session_id != $validated['session_id']) {
                abort(403, 'Guest session does not match the active table session.');
            }
        } elseif (! empty($validated['session_id'])) {
            $tableSession = TableSession::findOrFail($validated['session_id']);

            if ($tableSession->table_id != $validated['table_id']) {
                abort(403, 'Session does not belong to this table.');
            }

            $guestSession = \App\Models\GuestSession::where('table_session_id', $tableSession->id)
                ->where('table_id', $validated['table_id'])
                ->latest('created_at')
                ->first();
        }

        $query = Order::with(['items.menuItem'])
            ->where('table_id', $validated['table_id'])
            ->orderByDesc('created_at');

        if ($guestSession) {
            $query->where('guest_session_id', $guestSession->id);
        }

        $orders = $query->get();

        return response()->json([
            'data' => $orders->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'status' => $order->status,
                    'total' => (float) $order->total_amount,
                    'created_at' => $order->created_at?->toISOString(),
                    'items' => $order->items->map(function ($item) {
                        return [
                            'menu_item_id' => $item->menu_item_id,
                            'name' => $item->menuItem?->name ?? 'Menu item',
                            'quantity' => (int) $item->quantity,
                            'unit_price' => (float) $item->unit_price,
                            'notes' => $item->notes,
                        ];
                    })->values()->all(),
                ];
            })->all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'table_id' => ['required', 'exists:dining_tables,id'],
            'session_id' => ['required', 'exists:table_sessions,id'],
            'guest_session_id' => ['nullable', 'exists:guest_sessions,id'],
            'idempotency_key' => ['required', 'string', 'max:255'],
            'items' => ['required', 'array'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $session = TableSession::findOrFail($validated['session_id']);

        if ($session->status !== 'open' || $session->table_id != $validated['table_id']) {
            abort(403, 'Table session is not active.');
        }

        $guestSession = null;

        if (! empty($validated['guest_session_id'])) {
            $guestSession = \App\Models\GuestSession::where('id', $validated['guest_session_id'])
                ->where('table_session_id', $session->id)
                ->where('table_id', $validated['table_id'])
                ->firstOrFail();
        } else {
            $guestSession = \App\Models\GuestSession::where('table_session_id', $session->id)
                ->where('table_id', $validated['table_id'])
                ->latest('created_at')
                ->first();

            if (! $guestSession) {
                $guestSession = \App\Models\GuestSession::create([
                    'table_session_id' => $session->id,
                    'table_id' => $validated['table_id'],
                    'restaurant_id' => $session->branch?->restaurant_id,
                    'branch_id' => $session->branch_id,
                    'guest_token' => 'guest_' . Str::random(32),
                    'status' => 'active',
                    'started_at' => now(),
                ]);
            }
        }

        $existingOrder = Order::where('guest_session_id', $guestSession->id)
            ->where('idempotency_key', $validated['idempotency_key'])
            ->first();

        if ($existingOrder) {
            return response()->json([
                'data' => [
                    'order_id' => $existingOrder->id,
                    'status' => $existingOrder->status,
                    'total_amount' => $existingOrder->total_amount,
                    'guest_session_id' => $guestSession->id,
                ],
            ], 201);
        }

        $order = Order::create([
            'branch_id' => $session->branch_id,
            'table_session_id' => $session->id,
            'guest_session_id' => $guestSession->id,
            'table_id' => $validated['table_id'],
            'status' => 'submitted',
            'idempotency_key' => $validated['idempotency_key'],
            'total_amount' => 0,
        ]);

        $total = 0;

        foreach ($validated['items'] as $itemData) {
            $menuItem = MenuItem::findOrFail($itemData['menu_item_id']);
            $lineTotal = $menuItem->price * $itemData['quantity'];
            $total += $lineTotal;

            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => $menuItem->id,
                'quantity' => $itemData['quantity'],
                'unit_price' => $menuItem->price,
                'notes' => $itemData['notes'] ?? null,
            ]);
        }

        $order->total_amount = $total;
        $order->save();

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'status' => 'submitted',
                'total_amount' => $total,
                'guest_session_id' => $guestSession->id,
            ],
        ], 201);
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'table_id' => ['required', 'exists:dining_tables,id'],
            'session_id' => ['required', 'exists:table_sessions,id'],
            'guest_session_id' => ['nullable', 'exists:guest_sessions,id'],
            'items' => ['required', 'array'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:0'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $session = TableSession::findOrFail($validated['session_id']);

        if ($session->table_id != $validated['table_id']) {
            abort(403, 'Session does not belong to this table.');
        }

        if ($order->table_id != $validated['table_id'] || $order->table_session_id != $session->id) {
            abort(403, 'Order does not belong to this guest table session.');
        }

        if (! empty($validated['guest_session_id'])) {
            $guestSession = \App\Models\GuestSession::findOrFail($validated['guest_session_id']);

            if ($guestSession->table_id != $validated['table_id'] || $guestSession->table_session_id != $session->id || $order->guest_session_id != $guestSession->id) {
                abort(403, 'Guest session does not match the active table order.');
            }
        }

        if (! in_array($order->status, ['submitted', 'cancelled'], true)) {
            abort(409, 'This order can no longer be changed because the kitchen has already started it.');
        }

        $nextItems = [];
        $total = 0;

        foreach ($validated['items'] as $itemData) {
            $quantity = (int) $itemData['quantity'];

            if ($quantity <= 0) {
                continue;
            }

            $menuItem = MenuItem::findOrFail($itemData['menu_item_id']);
            $nextItems[] = [
                'menu_item_id' => $menuItem->id,
                'quantity' => $quantity,
                'unit_price' => $menuItem->price,
                'notes' => $itemData['notes'] ?? null,
            ];
            $total += $menuItem->price * $quantity;
        }

        $order->items()->delete();

        foreach ($nextItems as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => $item['menu_item_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'notes' => $item['notes'],
            ]);
        }

        if (empty($nextItems)) {
            $order->status = 'cancelled';
            $message = 'All items were removed, so this order was cancelled.';
        } else {
            $order->status = 'submitted';
            $message = 'Order updated successfully. Your changes were saved.';
        }

        $order->total_amount = $total;
        $order->save();

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'status' => $order->status,
                'total_amount' => $total,
                'items' => array_map(function ($item) {
                    return [
                        'menu_item_id' => $item['menu_item_id'],
                        'quantity' => (int) $item['quantity'],
                        'unit_price' => (float) $item['unit_price'],
                        'notes' => $item['notes'],
                    ];
                }, $nextItems),
                'message' => $message,
            ],
        ]);
    }

    public function destroy(Request $request, Order $order)
    {
        $validated = $request->validate([
            'table_id' => ['required', 'exists:dining_tables,id'],
            'session_id' => ['required', 'exists:table_sessions,id'],
            'guest_session_id' => ['nullable', 'exists:guest_sessions,id'],
        ]);

        $session = TableSession::findOrFail($validated['session_id']);

        if ($session->table_id != $validated['table_id']) {
            abort(403, 'Session does not belong to this table.');
        }

        if ($order->table_id != $validated['table_id'] || $order->table_session_id != $session->id) {
            abort(403, 'Order does not belong to this guest table session.');
        }

        if (! empty($validated['guest_session_id'])) {
            $guestSession = \App\Models\GuestSession::findOrFail($validated['guest_session_id']);

            if ($guestSession->table_id != $validated['table_id'] || $guestSession->table_session_id != $session->id || $order->guest_session_id != $guestSession->id) {
                abort(403, 'Guest session does not match the active table order.');
            }
        }

        if (! in_array($order->status, ['submitted', 'cancelled'], true)) {
            abort(409, 'This order can no longer be changed because the kitchen has already started it.');
        }

        $order->status = 'cancelled';
        $order->save();

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'status' => 'cancelled',
                'message' => 'Order cancelled successfully. You can place a new order now.',
            ],
        ]);
    }
}
