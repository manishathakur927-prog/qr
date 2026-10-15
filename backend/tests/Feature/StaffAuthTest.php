<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_user_can_login_and_access_protected_route(): void
    {
        $user = User::factory()->create([
            'email' => 'manager@example.com',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'manager@example.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonPath('user.email', 'manager@example.com')
            ->assertJsonStructure(['token', 'user']);

        $token = $loginResponse->json('token');

        $profileResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/user');

        $profileResponse->assertStatus(200)
            ->assertJsonPath('data.email', 'manager@example.com');
    }

    public function test_staff_logout_revokes_all_active_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'manager@example.com',
            'password' => 'password123',
        ]);

        $firstToken = $user->createToken('first-session')->plainTextToken;
        $secondToken = $user->createToken('second-session')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $secondToken)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJsonPath('message', 'Logged out successfully.');

        $this->assertCount(0, $user->fresh()->tokens);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->assertNotSame($firstToken, $user->fresh()->tokens()->first()?->token ?? '');
    }
}
