<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CallController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public Routes (No auth required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::get('/media/{filename}', [ChatController::class, 'serveMedia'])
    ->where('filename', '.*');

// Protected Routes (Sanctum auth required)
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/presence/heartbeat', [UserController::class, 'heartbeat']);

    // Chat
    Route::get('/chat/bootstrap', [ChatController::class, 'bootstrap']);
    Route::get('/messages/{user}', [ChatController::class, 'getMessages']);
    Route::post('/messages', [ChatController::class, 'sendMessage']);
    Route::post('/send-message', [ChatController::class, 'sendMessage']);
    Route::post('/messages/delivered', [ChatController::class, 'markDelivered']);
    Route::post('/messages/{user}/read', [ChatController::class, 'markRead']);
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
