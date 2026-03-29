<?php

namespace App\Http\Controllers;

use App\Http\Requests\Chat\ConversationUserRequest;
use App\Http\Requests\Chat\StoreMessageRequest;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    // Get all messages between authenticated user and another user
    public function getMessages(ConversationUserRequest $request, User $user)
    {
        $authUserId = $request->user()->id;

        $messages = Message::where(function ($query) use ($authUserId, $user) {
                        $query->where('sender_id', $authUserId)
                              ->where('receiver_id', $user->id);
                    })
                    ->orWhere(function ($query) use ($authUserId, $user) {
                        $query->where('sender_id', $user->id)
                              ->where('receiver_id', $authUserId);
                    })
                    ->with(['sender:id,name', 'receiver:id,name'])
                    ->orderBy('created_at', 'asc')
                    ->get();

        return response()->json($messages);
    }

    // Send a message
    public function sendMessage(StoreMessageRequest $request)
    {
        $message = Message::create([
            'sender_id'   => $request->user()->id,
            'receiver_id' => $request->receiver_id,
            'type'        => $request->input('type', 'text'),
            'content'     => $request->content,
            'media_url'   => $request->media_url,
        ]);

        $message->load(['sender:id,name', 'receiver:id,name']);

        return response()->json([
            'message' => 'Message sent successfully',
            'data'    => $message,
        ], 201);
    }

    public function clearMessages(ConversationUserRequest $request, User $user)
    {
        $authUserId = $request->user()->id;

        Message::where(function ($query) use ($authUserId, $user) {
                $query->where('sender_id', $authUserId)
                      ->where('receiver_id', $user->id);
            })
            ->orWhere(function ($query) use ($authUserId, $user) {
                $query->where('sender_id', $user->id)
                      ->where('receiver_id', $authUserId);
            })
            ->delete();

        return response()->json([
            'message' => 'Conversation cleared successfully',
        ]);
    }
}
