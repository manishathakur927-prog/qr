<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\TableSession;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
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
            \App\Models\SubscriptionPlan::firstOrCreate(
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

        $superAdmin = User::factory()->create([
            'name' => 'Platform Super Admin',
            'email' => 'superadmin@example.com',
            'password' => bcrypt('password123'),
            'is_super_admin' => true,
        ]);

        User::factory()->create([
            'name' => 'Manager User',
            'email' => 'manager@example.com',
            'password' => bcrypt('password123'),
        ]);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $restaurant = Restaurant::firstOrCreate(
            ['slug' => 'bluebird-table-service'],
            [
                'owner_id' => $superAdmin->id,
                'name' => 'Bluebird Table Service',
                'status' => 'active',
                'currency' => 'INR',
                'timezone' => 'Asia/Kolkata',
            ],
        );

        $branch = Branch::firstOrCreate(
            ['restaurant_id' => $restaurant->id, 'code' => 'MAIN'],
            [
                'restaurant_id' => $restaurant->id,
                'name' => 'Main Branch',
                'code' => 'MAIN',
                'address' => 'Main dining hall',
                'city' => 'Bengaluru',
                'country' => 'India',
                'timezone' => 'Asia/Kolkata',
                'status' => 'active',
            ],
        );

        $table = DiningTable::query()->firstOrNew(['id' => 4]);
        if (! $table->exists) {
            $table->branch_id = $branch->id;
            $table->table_number = '4';
            $table->name = 'Window table';
            $table->section = 'Main hall';
            $table->capacity = 4;
            $table->status = 'active';
            $table->save();
        }

        $session = TableSession::query()->where('table_id', $table->id)->where('status', 'open')->latest('opened_at')->first();

        if (! $session) {
            TableSession::create([
                'branch_id' => $branch->id,
                'table_id' => $table->id,
                'status' => 'open',
                'opened_by' => $superAdmin->id,
                'guest_pin_hash' => Hash::make('1234'),
                'opened_at' => now(),
            ]);
        }

        $menuItems = [
            ['id' => 1, 'name' => 'Classic Burger', 'price' => 249, 'description' => 'Grilled patty, cheddar, lettuce, toasted bun.', 'badge' => 'Best seller'],
            ['id' => 2, 'name' => 'Paneer Tikka Bowl', 'price' => 289, 'description' => 'Smoky paneer, rice, mint chutney, crunchy salad.', 'badge' => 'Chef special'],
            ['id' => 3, 'name' => 'Margherita Pizza', 'price' => 329, 'description' => 'Classic tomato sauce, mozzarella, basil.', 'badge' => 'Fresh oven'],
            ['id' => 4, 'name' => 'Cold Coffee', 'price' => 149, 'description' => 'Creamy cold coffee with a hint of vanilla.', 'badge' => 'Refreshing'],
        ];

        foreach ($menuItems as $menuItem) {
            $record = MenuItem::query()->firstOrNew(['id' => $menuItem['id']]);
            if (! $record->exists) {
                $record->restaurant_id = $restaurant->id;
                $record->branch_id = $branch->id;
                $record->name = $menuItem['name'];
                $record->description = $menuItem['description'];
                $record->price = $menuItem['price'];
                $record->currency = 'INR';
                $record->status = 'active';
                $record->save();
            }
        }
    }
}
