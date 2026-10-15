<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableQrFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_table_for_branch(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/tables', [
            'table_number' => 'A1',
            'name' => 'Window Table',
            'capacity' => 4,
            'section' => 'Terrace',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.table_number', 'A1');

        $this->assertDatabaseHas('dining_tables', ['branch_id' => $branch->id, 'table_number' => 'A1']);
    }

    public function test_owner_can_open_table_session(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);
        $table = $branch->diningTables()->create([
            'table_number' => 'A2',
            'name' => 'Center Table',
            'capacity' => 2,
            'section' => 'Main Hall',
            'status' => 'active',
        ]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/tables/' . $table->id . '/sessions', [
            'status' => 'open',
            'guest_pin' => '1234',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.guest_pin', '1234');

        $this->assertDatabaseHas('table_sessions', ['table_id' => $table->id, 'status' => 'open']);
        $this->assertTrue(password_verify('1234', $table->fresh()->sessions()->latest('opened_at')->first()->guest_pin_hash));
    }

    public function test_duplicate_table_number_in_same_branch_is_rejected(): void
    {
        $owner = User::factory()->create();
        $restaurant = Restaurant::factory()->create(['owner_id' => $owner->id]);
        $branch = Branch::factory()->create(['restaurant_id' => $restaurant->id]);

        $branch->diningTables()->create([
            'table_number' => 'B1',
            'name' => 'One',
            'capacity' => 2,
            'section' => 'Main',
            'status' => 'active',
        ]);

        $response = $this->actingAs($owner)->postJson('/api/v1/restaurants/' . $restaurant->id . '/branches/' . $branch->id . '/tables', [
            'table_number' => 'B1',
            'name' => 'Two',
            'capacity' => 4,
            'section' => 'Side',
        ]);

        $response->assertStatus(422);
    }
}
