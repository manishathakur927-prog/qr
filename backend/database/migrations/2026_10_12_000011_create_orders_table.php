<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('table_session_id')->nullable()->constrained('table_sessions')->cascadeOnDelete();
            $table->foreignId('table_id')->constrained('dining_tables')->cascadeOnDelete();
            $table->string('status')->default('submitted');
            $table->string('idempotency_key')->nullable()->unique();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
