<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\GuestSession;
use App\Models\TableSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GuestSessionController extends Controller
{
    public function menu(Request $request)
    {
        $validated = $request->validate([
            'table_id' => ['required', 'exists:dining_tables,id'],
            'pin' => ['required', 'string'],
        ]);

        $table = DiningTable::findOrFail($validated['table_id']);
        $session = TableSession::where('table_id', $table->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (! $session || ! Hash::check($validated['pin'], $session->guest_pin_hash ?? '')) {
            abort(403, 'Invalid table PIN or no active table session found.');
        }

        $branch = $session->branch()->first() ?? $table->branch()->first();
        $restaurant = $branch?->restaurant()->first();
        $menuItemsQuery = MenuItem::query()
            ->where('restaurant_id', $restaurant?->id)
            ->where('status', 'active');

        $branchMenuItems = $branch?->id
            ? (clone $menuItemsQuery)->where('branch_id', $branch->id)->orderBy('id')->get()
            : collect();

        $menuItems = ($branchMenuItems->isNotEmpty() ? $branchMenuItems : $menuItemsQuery->orderBy('id')->get())
            ->map(fn (MenuItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description,
                'image_url' => $item->image_url,
                'price' => (int) $item->price,
                'currency' => $item->currency ?? 'INR',
                'badge' => 'Popular',
            ])
            ->values();

        return response()->json([
            'data' => [
                'restaurant' => $restaurant ? ['id' => $restaurant->id, 'name' => $restaurant->name] : null,
                'menu_items' => $menuItems,
            ],
        ]);
    }

    public function join(Request $request)
    {
        $validated = $request->validate([
            'table_id' => ['required', 'exists:dining_tables,id'],
            'pin' => ['required', 'string'],
            'name' => ['required', 'string', 'max:120'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'guest_session_id' => ['nullable', 'exists:guest_sessions,id'],
            'guest_session_token' => ['nullable', 'string', 'max:255'],
        ]);

        $table = DiningTable::findOrFail($validated['table_id']);

        $session = TableSession::where('table_id', $table->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (! $session) {
            abort(403, 'No active table session found.');
        }

        if (! Hash::check($validated['pin'], $session->guest_pin_hash ?? '')) {
            abort(403, 'Invalid table PIN.');
        }

        $branch = $session->branch()->first() ?? $table->branch()->first();
        $restaurant = $branch?->restaurant()->first();

        $menuItemsQuery = MenuItem::query()
            ->where('restaurant_id', $restaurant?->id)
            ->where('status', 'active');

        $branchMenuItems = $branch?->id
            ? (clone $menuItemsQuery)
                ->where('branch_id', $branch->id)
                ->orderBy('id')
                ->get()
            : collect();

        $menuItems = ($branchMenuItems->isNotEmpty() ? $branchMenuItems : $menuItemsQuery->orderBy('id')->get())
            ->map(function (MenuItem $item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'image_url' => $item->image_url,
                    'price' => (int) $item->price,
                    'currency' => $item->currency ?? 'INR',
                    'badge' => 'Popular',
                ];
            });

        $guestSession = null;

        if (! empty($validated['guest_session_id'])) {
            $guestSession = GuestSession::where('id', $validated['guest_session_id'])
                ->where('table_session_id', $session->id)
                ->where('table_id', $table->id)
                ->first();
        }

        if (! $guestSession && ! empty($validated['guest_session_token'])) {
            $guestSession = GuestSession::where('guest_token', $validated['guest_session_token'])
                ->where('table_session_id', $session->id)
                ->where('table_id', $table->id)
                ->first();
        }

        if (! $guestSession) {
            $guestSession = GuestSession::create([
                'table_session_id' => $session->id,
                'table_id' => $table->id,
                'restaurant_id' => $restaurant?->id,
                'branch_id' => $branch?->id,
                'guest_token' => 'guest_' . Str::random(32),
                'status' => 'active',
                'started_at' => now(),
            ]);
        }

        $guestSession->name = trim($validated['name']);
        $guestSession->contact_number = isset($validated['contact_number'])
            ? trim($validated['contact_number']) ?: null
            : null;
        $guestSession->save();

        $currentOrder = Order::with('items.menuItem')
            ->where('guest_session_id', $guestSession->id)
            ->whereIn('status', ['submitted', 'preparing', 'ready', 'served'])
            ->latest('created_at')
            ->first();

        if (! $currentOrder) {
            $currentOrder = Order::with('items.menuItem')
                ->where('table_session_id', $session->id)
                ->where('table_id', $table->id)
                ->whereIn('status', ['submitted', 'preparing', 'ready', 'served'])
                ->latest('created_at')
                ->first();
        }

        $currentOrderPayload = null;

        if ($currentOrder) {
            $currentOrderPayload = [
                'id' => $currentOrder->id,
                'status' => $currentOrder->status,
                'total' => (float) $currentOrder->total_amount,
                'items' => $currentOrder->items->map(function ($item) {
                    return [
                        'menu_item_id' => $item->menu_item_id,
                        'name' => $item->menuItem?->name ?? 'Menu item',
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'notes' => $item->notes,
                        'description' => $item->menuItem?->description,
                        'image_url' => $item->menuItem?->image_url,
                    ];
                })->values()->all(),
            ];
        }

        return response()->json([
            'data' => [
                'session_id' => $session->id,
                'guest_session_id' => $guestSession->id,
                'guest_session_token' => $guestSession->guest_token,
                'guest_name' => $guestSession->name,
                'guest_contact_number' => $guestSession->contact_number,
                'table_id' => $table->id,
                'status' => 'joined',
                'restaurant' => $restaurant ? [
                    'id' => $restaurant->id,
                    'name' => $restaurant->name,
                    'slug' => $restaurant->slug,
                    'currency' => $restaurant->currency ?? 'INR',
                ] : null,
                'menu_items' => $menuItems,
                'current_order' => $currentOrderPayload,
            ],
        ]);
    }
}
