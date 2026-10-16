<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\Restaurant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

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

    public function update(Request $request, Restaurant $restaurant, Membership $membership)
    {
        $user = $request->user();

        if (! $user || (! $user->isSuperAdmin() && $user->id !== $restaurant->owner_id)) {
            abort(403, 'You are not allowed to edit this restaurant staff member.');
        }

        if ($membership->restaurant_id !== $restaurant->id) {
            abort(404, 'Staff membership not found for this restaurant.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($membership->user_id)],
            'role' => ['sometimes', 'required', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'in:active,inactive'],
            'branch_id' => ['sometimes', 'nullable', 'exists:branches,id'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
        ]);

        if (array_key_exists('branch_id', $validated) && ! empty($validated['branch_id'])
            && ! $restaurant->branches()->whereKey($validated['branch_id'])->exists()) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        $staffUser = User::findOrFail($membership->user_id);
        $staffUser->fill(array_intersect_key($validated, array_flip(['name', 'email'])));
        if (! empty($validated['password'])) {
            $staffUser->password = $validated['password'];
        }
        $staffUser->save();

        if (array_key_exists('role', $validated)) {
            $roleName = trim($validated['role']);
            $role = Role::where('restaurant_id', $restaurant->id)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($roleName)])
                ->first();

            if (! $role) {
                $role = Role::create([
                    'restaurant_id' => $restaurant->id,
                    'name' => $roleName,
                    'slug' => Str::slug($roleName) . '-' . $restaurant->id . '-' . Str::lower(Str::random(6)),
                    'description' => $roleName . ' role for this restaurant.',
                ]);
            }

            $membership->role_id = $role->id;
        }

        if (array_key_exists('status', $validated)) {
            $membership->status = $validated['status'];
        }
        if (array_key_exists('branch_id', $validated)) {
            $membership->branch_id = $validated['branch_id'] ?: null;
        }
        $membership->save();

        return response()->json([
            'data' => [
                'id' => $membership->id,
                'user_id' => $staffUser->id,
                'user' => ['id' => $staffUser->id, 'name' => $staffUser->name, 'email' => $staffUser->email],
                'role' => $membership->role()->first(['id', 'name', 'slug']),
                'branch' => $membership->branch()->first(['id', 'name']),
                'status' => $membership->status,
            ],
        ]);
    }
}
