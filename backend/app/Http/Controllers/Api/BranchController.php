<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class BranchController extends Controller
{
    public function store(Request $request, Restaurant $restaurant)
    {
        Gate::authorize('create-branch', $restaurant);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'timezone' => ['nullable', 'string', 'max:255'],
        ]);

        $branch = Branch::create([
            'restaurant_id' => $restaurant->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'country' => $validated['country'] ?? null,
            'timezone' => $validated['timezone'] ?? 'Asia/Kolkata',
            'status' => 'active',
        ]);

        return response()->json([
            'data' => $branch,
        ], 201);
    }
}
