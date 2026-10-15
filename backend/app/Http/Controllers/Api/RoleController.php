<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RoleController extends Controller
{
    public function index(Request $request, Restaurant $restaurant)
    {
        $user = $request->user();

        if (! $user || (! $user->isSuperAdmin() && $user->id !== $restaurant->owner_id)) {
            abort(403, 'You are not allowed to view this restaurant roles.');
        }

        $roles = Role::where('restaurant_id', $restaurant->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $roles,
        ]);
    }

    public function store(Request $request, Restaurant $restaurant)
    {
        Gate::authorize('create-role', $restaurant);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:roles,slug'],
            'description' => ['nullable', 'string'],
        ]);

        $role = Role::create([
            'restaurant_id' => $restaurant->id,
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'data' => $role,
        ], 201);
    }
}
