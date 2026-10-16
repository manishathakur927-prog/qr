<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guest_sessions', function (Blueprint $table) {
            $table->string('name', 120)->nullable()->after('guest_token');
            $table->string('contact_number', 30)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('guest_sessions', function (Blueprint $table) {
            $table->dropColumn(['name', 'contact_number']);
        });
    }
};
