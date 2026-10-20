<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\MenuItem;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;

class MenuItemController extends Controller
{
    public function index(Restaurant $restaurant, Branch $branch)
    {
        if ($restaurant->id !== $branch->restaurant_id) {
            abort(403, 'Branch does not belong to this restaurant.');
        }

        Gate::authorize('manage-restaurant', $restaurant);

        $items = MenuItem::where('restaurant_id', $restaurant->id)
            ->where('branch_id', $branch->id)
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $items,
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
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'price' => ['required', 'integer', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $imageUrl = $validated['image_url'] ?? null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('menu-items', 'public');
            $imageUrl = Storage::disk('public')->url($imagePath);
        }

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $branch->id,
            'category_id' => $request->input('category_id'),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'image_url' => $imageUrl,
            'price' => $validated['price'],
            'currency' => $validated['currency'] ?? 'INR',
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'data' => $item,
        ], 201);
    }
}
