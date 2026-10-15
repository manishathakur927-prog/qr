<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\DiningTable;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrTokenFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_generate_and_revoke_table_qr_token(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = DiningTable::create([
            'branch_id' => $branch->id,
            'table_number' => 'Q1',
            'capacity' => 2,
            'status' => 'active',
        ]);

        $generateResponse = $this->actingAs($owner)->postJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/tables/' . $table->id . '/qr-token'
        );

        $generateResponse->assertStatus(201)
            ->assertJsonPath('data.table_id', $table->id)
            ->assertJsonPath('data.revoked', false)
            ->assertJsonPath('data.qr_url', function ($value) {
                return is_string($value) && str_contains($value, 'table=') && str_contains($value, 'pin=');
            });

        $token = $generateResponse->json('data.token');
        $this->assertNotEmpty($token);

        $this->assertDatabaseHas('dining_tables', ['id' => $table->id]);
        $this->assertNotNull($table->fresh()->qr_token_hash);

        $revokeResponse = $this->actingAs($owner)->deleteJson(
            '/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/tables/' . $table->id . '/qr-token'
        );

        $revokeResponse->assertStatus(200)
            ->assertJsonPath('data.revoked', true);

        $this->assertTrue($table->fresh()->qr_token_hash === null || $table->fresh()->qr_token_hash === '');
    }
}
