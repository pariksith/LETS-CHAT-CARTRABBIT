<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        // For API, return null (no redirect, just 401)
        if ($request->expectsJson()) {
            return null;
        }
        return null;
    }

    protected function unauthenticated($request, array $guards)
    {
        abort(response()->json([
            'message' => 'Unauthenticated. Please login.'
        ], 401));
    }
}
