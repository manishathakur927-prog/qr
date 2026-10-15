<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dining_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('table_number');
            $table->string('name')->nullable();
            $table->string('section')->nullable();
            $table->unsignedInteger('capacity')->default(2);
            $table->string('status')->default('active');
            $table->string('qr_token_hash')->nullable();
            $table->timestamps();

            $table->unique(['branch_id', 'table_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dining_tables');
    }
};
