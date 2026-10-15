<?php

namespace App\Providers;

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('manage-platform', function (User $user) {
            return $user->isSuperAdmin();
        });

        Gate::define('manage-restaurant', function (User $user, Restaurant $restaurant) {
            return $user->hasRestaurantPermission($restaurant, 'manage-restaurant');
        });

        Gate::define('create-branch', function (User $user, Restaurant $restaurant) {
            return $user->hasRestaurantPermission($restaurant, 'create-branch');
        });

        Gate::define('create-role', function (User $user, Restaurant $restaurant) {
            return $user->hasRestaurantPermission($restaurant, 'create-role');
        });

        Gate::define('create-membership', function (User $user, Restaurant $restaurant) {
            return $user->hasRestaurantPermission($restaurant, 'create-membership');
        });

        Gate::define('manage-table-qr', function (User $user, Restaurant $restaurant) {
            return $user->hasRestaurantPermission($restaurant, 'manage-table-qr');
        });
    }
}
