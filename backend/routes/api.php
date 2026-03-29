<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CallController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public Routes (No auth required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Protected Routes (Sanctum auth required)
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Users
    Route::get('/users', [UserController::class, 'index']);

    // Chat
    Route::get('/messages/{user}', [ChatController::class, 'getMessages']);
    Route::post('/messages', [ChatController::class, 'sendMessage']);
    Route::delete('/messages/{user}', [ChatController::class, 'clearMessages']);

    // Calls
    Route::get('/calls/current', [CallController::class, 'current']);
    Route::post('/calls', [CallController::class, 'store']);
    Route::get('/calls/{call}', [CallController::class, 'show']);
    Route::post('/calls/{call}/offer', [CallController::class, 'offer']);
    Route::post('/calls/{call}/answer', [CallController::class, 'answer']);
    Route::post('/calls/{call}/candidate', [CallController::class, 'candidate']);
    Route::post('/calls/{call}/decline', [CallController::class, 'decline']);
    Route::post('/calls/{call}/end', [CallController::class, 'end']);
});
