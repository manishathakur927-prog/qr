<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->decimal('price_annual', 10, 2)->default(0);
            $table->unsignedInteger('max_tables')->default(10);
            $table->json('features')->nullable();
            $table->timestamps();
        });

        Schema::table('restaurants', function (Blueprint $table) {
            $table->foreignId('subscription_plan_id')->nullable()->after('timezone')->constrained('subscription_plans')->nullOnDelete();
            $table->string('subscription_status')->default('inactive')->after('subscription_plan_id');
            $table->string('billing_cycle')->default('monthly')->after('subscription_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subscription_plan_id');
            $table->dropColumn(['subscription_status', 'billing_cycle']);
        });

        Schema::dropIfExists('subscription_plans');
    }
};
