<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function index(Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        Gate::authorize('manage-restaurant', $restaurant);

        $categories = \App\Models\Category::where('restaurant_id', $restaurant->id)
            ->where('branch_id', $branch->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function store(Request $request, Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        Gate::authorize('manage-restaurant', $restaurant);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = Category::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json([
            'data' => $category,
        ], 201);
    }
}
