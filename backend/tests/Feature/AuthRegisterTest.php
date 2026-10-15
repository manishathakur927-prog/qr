<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_register_and_login(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Hotel Owner',
            'email' => 'owner@example.com',
            'password' => 'secure123',
            'password_confirmation' => 'secure123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', 'owner@example.com');

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'secure123',
        ]);

        $login->assertStatus(200)
            ->assertJsonPath('user.email', 'owner@example.com');
    }
}
