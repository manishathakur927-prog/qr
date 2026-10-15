<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\Restaurant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MembershipController extends Controller
{
    public function index(Request $request, Restaurant $restaurant)
    {
        $user = $request->user();

        if (! $user || (! $user->isSuperAdmin() && $user->id !== $restaurant->owner_id)) {
            abort(403, 'You are not allowed to view this restaurant staff list.');
        }

        $memberships = Membership::where('restaurant_id', $restaurant->id)
            ->with(['user', 'role', 'branch'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $memberships->map(function (Membership $membership) {
                return [
                    'id' => $membership->id,
                    'user_id' => $membership->user_id,
                    'user' => $membership->user ? [
                        'id' => $membership->user->id,
                        'name' => $membership->user->name,
                        'email' => $membership->user->email,
                    ] : null,
                    'role' => $membership->role ? [
                        'id' => $membership->role->id,
                        'name' => $membership->role->name,
                        'slug' => $membership->role->slug,
                    ] : null,
                    'branch' => $membership->branch ? [
                        'id' => $membership->branch->id,
                        'name' => $membership->branch->name,
                    ] : null,
                    'status' => $membership->status ?? 'active',
                ];
            }),
        ]);
    }

    public function store(Request $request, Restaurant $restaurant)
    {
        Gate::authorize('create-membership', $restaurant);

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role_id' => ['nullable', 'exists:roles,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        if (!empty($validated['role_id'])) {
            $role = Role::where('id', $validated['role_id'])
                ->where('restaurant_id', $restaurant->id)
                ->first();

            if (! $role) {
                abort(403, 'Role does not belong to this restaurant.');
            }
        }

        if (!empty($validated['branch_id']) && $restaurant->branches()->whereKey($validated['branch_id'])->doesntExist()) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        $user = User::findOrFail($validated['user_id']);

        $membership = Membership::create([
            'user_id' => $user->id,
            'restaurant_id' => $restaurant->id,
            'branch_id' => $validated['branch_id'] ?? null,
            'role_id' => $validated['role_id'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'data' => $membership,
        ], 201);
    }
}
