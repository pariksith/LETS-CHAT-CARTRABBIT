<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Register a new user
    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();
        $payload = [
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ];

        if ($this->supportsPresenceColumns()) {
            $payload['is_online'] = true;
            $payload['last_seen_at'] = now();
        }

        $user = User::create($payload);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    // Login user
    public function login(LoginRequest $request)
    {
        $validated = $request->validated();
        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke old tokens
        $user->tokens()->delete();
        $this->touchPresence($user, true);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    // Logout user
    public function logout(Request $request)
    {
        $this->touchPresence($request->user(), false);
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    // Get authenticated user
    public function me(Request $request)
    {
        $user = $request->user();
        $this->touchPresence($user, true);

        return response()->json($user->fresh());
    }

    private function supportsPresenceColumns(): bool
    {
        static $supported = null;

        if ($supported === null) {
            $supported = Schema::hasColumn('users', 'is_online')
                && Schema::hasColumn('users', 'last_seen_at');
        }

        return $supported;
    }

    private function touchPresence(User $user, bool $isOnline): void
    {
        if (!$this->supportsPresenceColumns()) {
            return;
        }

        $user->forceFill([
            'is_online' => $isOnline,
            'last_seen_at' => now(),
        ])->save();
    }
}
