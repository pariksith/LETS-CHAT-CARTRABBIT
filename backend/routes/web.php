<?php

use Illuminate\Support\Facades\Route;

function frontendUrl(string $path = '/'): string
{
    $base = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
    $normalizedPath = '/' . ltrim($path, '/');

    return $base . $normalizedPath;
}

Route::get('/', function () {
    return redirect()->away(frontendUrl('/'));
});

Route::get('/login', fn () => redirect()->away(frontendUrl('/login')));
Route::get('/register', fn () => redirect()->away(frontendUrl('/register')));
Route::get('/chat', fn () => redirect()->away(frontendUrl('/chat')));
