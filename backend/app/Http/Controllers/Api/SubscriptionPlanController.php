<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;

class SubscriptionPlanController extends Controller
{
    public function index()
    {
        $this->ensureDefaultPlans();

        return response()->json([
            'data' => SubscriptionPlan::orderBy('price_monthly')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Only platform super admins can manage subscription plans.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:subscription_plans,slug'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_annual' => ['required', 'numeric', 'min:0'],
            'max_tables' => ['required', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
        ]);

        $plan = SubscriptionPlan::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'price_monthly' => $validated['price_monthly'],
            'price_annual' => $validated['price_annual'],
            'max_tables' => $validated['max_tables'],
            'features' => $validated['features'] ?? [],
        ]);

        return response()->json([
            'data' => $plan,
        ], 201);
    }

    public function update(Request $request, SubscriptionPlan $subscriptionPlan)
    {
        $user = $request->user();

        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Only platform super admins can manage subscription plans.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:subscription_plans,slug,' . $subscriptionPlan->id],
            'price_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_annual' => ['sometimes', 'numeric', 'min:0'],
            'max_tables' => ['sometimes', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
        ]);

        $subscriptionPlan->fill($validated);
        $subscriptionPlan->save();

        return response()->json([
            'data' => $subscriptionPlan,
        ]);
    }

    public function destroy(Request $request, SubscriptionPlan $subscriptionPlan)
    {
        $user = $request->user();

        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Only platform super admins can manage subscription plans.');
        }

        Restaurant::where('subscription_plan_id', $subscriptionPlan->id)
            ->update([
                'subscription_plan_id' => null,
                'subscription_status' => 'inactive',
            ]);

        $subscriptionPlan->delete();

        return response()->json([
            'message' => 'Subscription plan deleted successfully.',
        ]);
    }

    public function assignToRestaurant(Request $request, Restaurant $restaurant)
    {
        $this->ensureDefaultPlans();

        $user = $request->user();

        if (! $user->isSuperAdmin() && $user->id !== $restaurant->owner_id) {
            abort(403, 'You are not allowed to manage this restaurant subscription.');
        }

        $validated = $request->validate([
            'plan_slug' => ['required', 'string', 'exists:subscription_plans,slug'],
            'billing_cycle' => ['required', 'in:monthly,annual'],
        ]);

        $plan = SubscriptionPlan::where('slug', $validated['plan_slug'])->firstOrFail();

        $restaurant->subscription_plan_id = $plan->id;
        $restaurant->billing_cycle = $validated['billing_cycle'];
        $restaurant->subscription_status = 'active';
        $restaurant->save();

        $restaurant->load('subscriptionPlan');

        return response()->json([
            'data' => [
                'restaurant_id' => $restaurant->id,
                'subscription_plan' => $restaurant->subscriptionPlan,
                'subscription_status' => $restaurant->subscription_status,
                'billing_cycle' => $restaurant->billing_cycle,
            ],
        ]);
    }

    protected function ensureDefaultPlans(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price_monthly' => 0,
                'price_annual' => 0,
                'max_tables' => 5,
                'features' => ['1 restaurant', '5 tables', 'Basic QR'],
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price_monthly' => 1999,
                'price_annual' => 19900,
                'max_tables' => 25,
                'features' => ['Unlimited menu items', '25 tables', 'Priority support'],
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price_monthly' => 4999,
                'price_annual' => 49900,
                'max_tables' => 200,
                'features' => ['Multi-branch', 'Custom onboarding', 'Dedicated support'],
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::query()->firstOrCreate(
                ['slug' => $plan['slug']],
                [
                    'name' => $plan['name'],
                    'price_monthly' => $plan['price_monthly'],
                    'price_annual' => $plan['price_annual'],
                    'max_tables' => $plan['max_tables'],
                    'features' => $plan['features'],
                ],
            );
        }
    }
}
