<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RestaurantController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $restaurantsQuery = $user->isSuperAdmin()
            ? Restaurant::query()
            : Restaurant::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('memberships', function ($membershipQuery) use ($user) {
                        $membershipQuery->where('user_id', $user->id)->where('status', 'active');
                    });
            });

        $restaurants = $restaurantsQuery
            ->with(['branches' => function ($query) use ($user) {
                if (! $user->isSuperAdmin()) {
                    $wideRestaurantIds = $user->memberships()
                        ->where('status', 'active')
                        ->whereNull('branch_id')
                        ->pluck('restaurant_id');
                    $assignedBranchIds = $user->memberships()
                        ->where('status', 'active')
                        ->whereNotNull('branch_id')
                        ->pluck('branch_id');

                    if ($user->id !== null) {
                        $query->where(function ($branchQuery) use ($user, $wideRestaurantIds, $assignedBranchIds) {
                            $branchQuery->whereIn('branches.restaurant_id', $wideRestaurantIds)
                                ->orWhereIn('branches.id', $assignedBranchIds)
                                ->orWhereIn('branches.restaurant_id', Restaurant::where('owner_id', $user->id)->select('id'));
                        });
                    }
                }

                $query->with('diningTables');
            }, 'subscriptionPlan'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $restaurants,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $hasActiveMembership = $user->memberships()->where('status', 'active')->exists();

        if ($hasActiveMembership) {
            abort(403, 'Employee accounts cannot create a separate restaurant. Ask the restaurant owner to manage your membership.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:restaurants,slug'],
            'currency' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'max:255'],
        ]);

        $restaurant = Restaurant::create([
            'owner_id' => $request->user()->id,
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'status' => 'draft',
            'currency' => $validated['currency'] ?? 'INR',
            'timezone' => $validated['timezone'] ?? 'Asia/Kolkata',
            'subscription_status' => 'inactive',
            'billing_cycle' => 'monthly',
        ]);

        return response()->json([
            'data' => $restaurant,
        ], 201);
    }

    public function impersonate(Request $request, Restaurant $restaurant)
    {
        $user = $request->user();

        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Only the platform super admin can login as a restaurant.');
        }

        $restaurant->load('owner');
        $owner = $restaurant->owner;

        if (! $owner) {
            abort(404, 'No restaurant owner found for this restaurant.');
        }

        $token = $owner->createToken('restaurant-access')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'is_super_admin' => false,
            ],
            'restaurant_id' => $restaurant->id,
            'restaurant' => [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'slug' => $restaurant->slug,
            ],
        ]);
    }

    public function update(Request $request, Restaurant $restaurant)
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $user->id !== $restaurant->owner_id) {
            abort(403, 'You are not allowed to update this restaurant.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:restaurants,slug,' . $restaurant->id],
            'status' => ['sometimes', 'in:draft,active,inactive'],
            'currency' => ['sometimes', 'string', 'max:10'],
            'timezone' => ['sometimes', 'string', 'max:255'],
        ]);

        $restaurant->fill($validated);
        $restaurant->save();

        return response()->json([
            'data' => $restaurant,
        ]);
    }

    public function destroy(Request $request, Restaurant $restaurant)
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $user->id !== $restaurant->owner_id) {
            abort(403, 'You are not allowed to delete this restaurant.');
        }

        $restaurant->delete();

        return response()->json([
            'message' => 'Restaurant deleted successfully.',
        ]);
    }
}
