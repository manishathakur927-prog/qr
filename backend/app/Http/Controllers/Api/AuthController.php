<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $token = $user->createToken('staff-access')->plainTextToken;
        $roleName = $user->isSuperAdmin() ? 'Super Admin' : 'Owner';

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'role_name' => $roleName,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid login credentials.',
            ], 401);
        }

        $token = $user->createToken('staff-access')->plainTextToken;
        $membershipRole = $user->memberships()->with('role')->where('status', 'active')->latest()->first();
        $roleName = $membershipRole?->role?->name ?? ($user->isSuperAdmin() ? 'Super Admin' : 'Owner');

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'role_name' => $roleName,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        $membershipRole = $user->memberships()->with('role')->where('status', 'active')->latest()->first();
        $roleName = $membershipRole?->role?->name ?? ($user->isSuperAdmin() ? 'Super Admin' : 'Owner');

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'role_name' => $roleName,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
