<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\DiningTable;
use App\Models\Restaurant;
use App\Models\TableSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TableController extends Controller
{
    public function index(Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        Gate::authorize('manage-restaurant', $restaurant);

        $tables = $branch->diningTables()->orderBy('id')->get();

        return response()->json([
            'data' => $tables->map(fn ($table) => [
                'id' => $table->id,
                'table_number' => $table->table_number,
                'name' => $table->name,
                'section' => $table->section,
                'capacity' => (int) $table->capacity,
                'status' => $table->status,
            ]),
        ]);
    }

    public function store(Request $request, Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        Gate::authorize('manage-restaurant', $restaurant);

        $validated = $request->validate([
            'table_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('dining_tables')->where(fn ($query) => $query->where('branch_id', $branch->id)),
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'section' => ['nullable', 'string', 'max:255'],
        ]);

        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => $validated['table_number'],
            'name' => $validated['name'] ?? null,
            'section' => $validated['section'] ?? null,
            'capacity' => $validated['capacity'] ?? 2,
            'status' => 'active',
            'qr_token_hash' => null,
        ]);

        return response()->json(['data' => $table], 201);
    }

    public function storeSession(Request $request, Restaurant $restaurant, Branch $branch, DiningTable $table)
    {
        if ($restaurant->id !== $branch->restaurant_id || $branch->id !== $table->branch_id) {
            abort(403, 'Table does not belong to this restaurant branch.');
        }

        Gate::authorize('manage-restaurant', $restaurant);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:open,closed'],
            'guest_pin' => ['nullable', 'string', 'min:4', 'max:6'],
        ]);

        $guestPin = $validated['guest_pin'] ?? (string) random_int(1000, 9999);

        $session = TableSession::where('table_id', $table->id)
            ->latest('opened_at')
            ->first();

        if ($session && $session->status === 'open') {
            $session->status = $validated['status'];
            $session->guest_pin_hash = Hash::make($guestPin);
            $session->opened_by = $request->user()->id;
            $session->opened_at = now();
            $session->closed_at = $validated['status'] === 'closed' ? now() : null;
            $session->save();

            return response()->json([
                'data' => [
                    'id' => $session->id,
                    'status' => $session->status,
                    'guest_pin' => $guestPin,
                ],
            ], 201);
        }

        $session = TableSession::create([
            'branch_id' => $branch->id,
            'table_id' => $table->id,
            'status' => $validated['status'],
            'opened_by' => $request->user()->id,
            'guest_pin_hash' => Hash::make($guestPin),
            'opened_at' => now(),
            'closed_at' => $validated['status'] === 'closed' ? now() : null,
        ]);

        return response()->json([
            'data' => [
                'id' => $session->id,
                'status' => $session->status,
                'guest_pin' => $guestPin,
            ],
        ], 201);
    }

    public function generateQrToken(Request $request, Restaurant $restaurant, Branch $branch, DiningTable $table)
    {
        if ($restaurant->id !== $branch->restaurant_id || $branch->id !== $table->branch_id) {
            abort(403, 'Table does not belong to this restaurant branch.');
        }

        Gate::authorize('manage-table-qr', $restaurant);

        $guestPin = (string) ($request->input('guest_pin') ?: random_int(1000, 9999));

        $session = TableSession::where('table_id', $table->id)
            ->latest('opened_at')
            ->first();

        if (! $session || $session->status !== 'open') {
            $session = TableSession::create([
                'branch_id' => $branch->id,
                'table_id' => $table->id,
                'status' => 'open',
                'opened_by' => $request->user()?->id,
                'guest_pin_hash' => Hash::make($guestPin),
                'opened_at' => now(),
            ]);
        } else {
            $session->guest_pin_hash = Hash::make($guestPin);
            $session->opened_by = $request->user()?->id ?? $session->opened_by;
            $session->save();
        }

        $token = Str::random(32);
        $table->qr_token_hash = Hash::make($token);
        $table->save();

        $frontendBase = env('FRONTEND_URL');

        if (! $frontendBase) {
            $origin = $request->header('origin') ?: $request->header('referer');

            if ($origin) {
                $parsedOrigin = parse_url($origin, PHP_URL_SCHEME) && parse_url($origin, PHP_URL_HOST)
                    ? parse_url($origin, PHP_URL_SCHEME) . '://' . parse_url($origin, PHP_URL_HOST)
                    : null;

                if (parse_url($origin, PHP_URL_PORT)) {
                    $parsedOrigin .= ':' . parse_url($origin, PHP_URL_PORT);
                }

                $frontendBase = $parsedOrigin;
            }
        }

        $frontendBase = $frontendBase ?: 'http://localhost:5173';
        $qrUrl = rtrim($frontendBase, '/') . '/?table=' . urlencode((string) $table->id) . '&pin=' . urlencode($guestPin);

        return response()->json([
            'data' => [
                'table_id' => $table->id,
                'token' => $token,
                'guest_pin' => $guestPin,
                'qr_url' => $qrUrl,
                'revoked' => false,
            ],
        ], 201);
    }

    public function revokeQrToken(Restaurant $restaurant, Branch $branch, DiningTable $table)
    {
        if ($restaurant->id !== $branch->restaurant_id || $branch->id !== $table->branch_id) {
            abort(403, 'Table does not belong to this restaurant branch.');
        }

        Gate::authorize('manage-table-qr', $restaurant);

        $table->qr_token_hash = null;
        $table->save();

        return response()->json([
            'data' => [
                'table_id' => $table->id,
                'revoked' => true,
            ],
        ]);
    }
}
