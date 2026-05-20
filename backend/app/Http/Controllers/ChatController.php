<?php

namespace App\Http\Controllers;

use App\Http\Requests\Chat\ConversationUserRequest;
use App\Http\Requests\Chat\StoreMessageRequest;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ChatController extends Controller
{
    private const LOCAL_MEDIA_DIRECTORY = 'chat-media';

    public function bootstrap(Request $request): JsonResponse
    {
        $authUser = $request->user();
        $supportsPresence = $this->supportsPresenceColumns();
        $userSelect = ['id', 'name', 'email', 'created_at'];

        if ($supportsPresence) {
            $userSelect[] = 'is_online';
            $userSelect[] = 'last_seen_at';
        }

        $users = User::where('id', '!=', $authUser->id)
            ->select($userSelect)
            ->orderBy('name', 'asc')
            ->get();

        if ($supportsPresence) {
            $presenceCutoff = now()->subSeconds(45);

            $users->transform(function (User $user) use ($presenceCutoff) {
                $user->is_online = (bool) $user->is_online
                    && $user->last_seen_at !== null
                    && $user->last_seen_at->greaterThan($presenceCutoff);

                return $user;
            });
        } else {
            $users->transform(function (User $user) {
                $user->is_online = false;
                $user->last_seen_at = null;

                return $user;
            });
        }

        $selectedUserId = (int) $request->query('selected_user_id', 0);
        $selectedUser = $selectedUserId > 0
            ? $users->firstWhere('id', $selectedUserId)
            : null;

        if (!$selectedUser) {
            $selectedUser = $users->sortBy([
                ['is_online', 'desc'],
                ['last_seen_at', 'desc'],
                ['name', 'asc'],
            ])->first();
        }

        $messages = collect();

        if ($selectedUser) {
            $this->markConversationAsRead($authUser->id, $selectedUser->id);
            $messages = $this->conversationMessages($authUser->id, $selectedUser->id);
        }

        return response()->json([
            'user' => $authUser,
            'users' => $users->values(),
            'selected_user_id' => $selectedUser?->id,
            'messages' => $messages,
        ]);
    }

    // Get all messages between authenticated user and another user
    public function getMessages(ConversationUserRequest $request, User $user)
    {
        $authUserId = $request->user()->id;
        $otherUserId = $user->id;

        $this->markConversationAsRead($authUserId, $otherUserId);

        return response()->json($this->conversationMessages($authUserId, $otherUserId));
    }

    // Send a message
    public function sendMessage(StoreMessageRequest $request)
    {
        $payload = [
            'sender_id'   => $request->user()->id,
            'receiver_id' => $request->receiver_id,
            'type'        => $request->input('type', 'text'),
            'content'     => $request->content,
            'media_url'   => $this->storeMediaDataUrl($request->media_url),
        ];

        if (Schema::hasColumn('messages', 'duration_seconds')) {
            $payload['duration_seconds'] = $request->duration_seconds;
        }

        $message = Message::create($payload);

        $message->load(['sender:id,name', 'receiver:id,name']);
        $message = $this->normalizeMessageMediaUrl($message);

        return response()->json([
            'message' => 'Message sent successfully',
            'data'    => $message,
        ], 201);
    }

    public function serveMedia(string $filename): BinaryFileResponse
    {
        $safeFilename = basename($filename);
        $absolutePath = public_path(self::LOCAL_MEDIA_DIRECTORY . DIRECTORY_SEPARATOR . $safeFilename);

        abort_unless(
            $safeFilename !== ''
                && File::exists($absolutePath)
                && str_starts_with(realpath($absolutePath) ?: '', realpath(public_path(self::LOCAL_MEDIA_DIRECTORY)) ?: ''),
            404
        );

        $fallbackMime = File::mimeType($absolutePath) ?: 'application/octet-stream';

        return response()->file($absolutePath, [
            'Content-Type' => $this->guessResponseMimeFromFilename($safeFilename, $fallbackMime),
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'Accept-Ranges' => 'bytes',
        ]);
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

    public function markDelivered(Request $request): JsonResponse
    {
        if (!$this->supportsMessageStatusColumns()) {
            return response()->json([
                'message' => 'Message status columns are not available in this database yet.',
            ]);
        }

        $timestamp = now();

        Message::where('receiver_id', $request->user()->id)
            ->whereNull('delivered_at')
            ->update([
                'delivered_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);

        return response()->json([
            'message' => 'Pending messages marked as delivered.',
        ]);
    }

    public function markRead(ConversationUserRequest $request, User $user): JsonResponse
    {
        $this->markConversationAsRead($request->user()->id, $user->id);

        return response()->json([
            'message' => 'Conversation marked as read.',
        ]);
    }

    private function markConversationAsRead(int $authUserId, int $otherUserId): void
    {
        if (!$this->supportsMessageStatusColumns()) {
            return;
        }

        $timestamp = now();

        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $authUserId)
            ->whereNull('read_at')
            ->update([
                'delivered_at' => $timestamp,
                'read_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
    }

    private function conversationMessages(int $authUserId, int $otherUserId)
    {
        $messages = Message::where(function ($query) use ($authUserId, $otherUserId) {
                $query->where(function ($q) use ($authUserId, $otherUserId) {
                    $q->where('sender_id', $authUserId)
                        ->where('receiver_id', $otherUserId);
                })
                ->orWhere(function ($q) use ($authUserId, $otherUserId) {
                    $q->where('sender_id', $otherUserId)
                        ->where('receiver_id', $authUserId);
                });
            })
            ->with(['sender:id,name', 'receiver:id,name'])
            ->orderBy('created_at', 'asc')
            ->get();

        $messages->transform(function (Message $message) {
            return $this->normalizeMessageMediaUrl($message);
        });

        return $messages;
    }

    private function supportsMessageStatusColumns(): bool
    {
        static $supported = null;

        if ($supported === null) {
            $supported = Schema::hasColumn('messages', 'delivered_at')
                && Schema::hasColumn('messages', 'read_at');
        }

        return $supported;
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

    private function normalizeMessageMediaUrl(Message $message): Message
    {
        if (!is_string($message->media_url) || trim($message->media_url) === '') {
            return $message;
        }

        $storedPath = $this->normalizeStoredMediaReference($message->media_url, $message->id);

        if ($storedPath !== $message->media_url) {
            $message->forceFill([
                'media_url' => $storedPath,
            ]);

            $message->saveQuietly();
        }

        $publicUrl = $this->buildPublicMediaUrl($message->media_url);

        if ($publicUrl !== null) {
            $message->media_url = $publicUrl;
        }

        return $message;
    }

    private function storeMediaDataUrl(?string $mediaUrl, ?int $messageId = null): ?string
    {
        if (!is_string($mediaUrl) || !str_starts_with($mediaUrl, 'data:')) {
            return $mediaUrl;
        }

        $parsedMedia = $this->parseDataUrl($mediaUrl);

        if ($parsedMedia === null) {
            return $mediaUrl;
        }

        $directory = public_path(self::LOCAL_MEDIA_DIRECTORY);

        if (!File::isDirectory($directory)) {
            File::ensureDirectoryExists($directory);
        }

        $extension = $this->guessExtensionFromMime($parsedMedia['mime']);
        $filename = $messageId
            ? "message-{$messageId}.{$extension}"
            : 'message-' . Str::uuid() . ".{$extension}";
        $absolutePath = $directory . DIRECTORY_SEPARATOR . $filename;

        if (!File::exists($absolutePath)) {
            File::put($absolutePath, $parsedMedia['data']);
        }

        return self::LOCAL_MEDIA_DIRECTORY . "/{$filename}";
    }

    private function normalizeStoredMediaReference(?string $mediaUrl, ?int $messageId = null): ?string
    {
        if (!is_string($mediaUrl) || trim($mediaUrl) === '') {
            return $mediaUrl;
        }

        if (str_starts_with($mediaUrl, 'data:')) {
            return $this->storeMediaDataUrl($mediaUrl, $messageId);
        }

        $filename = $this->extractStoredMediaFilename($mediaUrl);

        if ($filename === null) {
            return $mediaUrl;
        }

        return self::LOCAL_MEDIA_DIRECTORY . "/{$filename}";
    }

    private function buildPublicMediaUrl(?string $mediaUrl): ?string
    {
        $filename = $this->extractStoredMediaFilename($mediaUrl);

        if ($filename === null) {
            return null;
        }

        return '/api/media/' . rawurlencode($filename);
    }

    private function extractStoredMediaFilename(?string $mediaUrl): ?string
    {
        if (!is_string($mediaUrl) || trim($mediaUrl) === '') {
            return null;
        }

        $path = $mediaUrl;

        if (filter_var($mediaUrl, FILTER_VALIDATE_URL)) {
            $path = parse_url($mediaUrl, PHP_URL_PATH) ?: '';
        }

        $normalizedPath = str_replace('\\', '/', trim($path));
        $marker = '/' . self::LOCAL_MEDIA_DIRECTORY . '/';

        if (str_contains($normalizedPath, $marker)) {
            return basename(substr($normalizedPath, strpos($normalizedPath, $marker) + strlen($marker)));
        }

        if (str_starts_with($normalizedPath, self::LOCAL_MEDIA_DIRECTORY . '/')) {
            return basename(substr($normalizedPath, strlen(self::LOCAL_MEDIA_DIRECTORY . '/')));
        }

        return null;
    }

    private function parseDataUrl(string $mediaUrl): ?array
    {
        $commaPosition = strpos($mediaUrl, ',');

        if ($commaPosition === false) {
            return null;
        }

        $metadata = substr($mediaUrl, 5, $commaPosition - 5);
        $encoded = substr($mediaUrl, $commaPosition + 1);

        if (!str_contains($metadata, ';base64')) {
            return null;
        }

        $mime = trim(explode(';', $metadata)[0] ?? '');
        $decoded = base64_decode($encoded, true);

        if ($mime === '' || $decoded === false) {
            return null;
        }

        return [
            'mime' => $mime,
            'data' => $decoded,
        ];
    }

    private function guessExtensionFromMime(string $mime): string
    {
        $normalizedMime = strtolower(trim(explode(';', $mime)[0] ?? ''));

        return match ($normalizedMime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'audio/webm' => 'webm',
            'audio/mp4', 'audio/x-m4a' => 'm4a',
            'audio/mpeg' => 'mp3',
            'audio/wav' => 'wav',
            'audio/aac', 'audio/mp4a-latm' => 'aac',
            'audio/ogg' => 'ogg',
            'video/mp4' => 'mp4',
            'application/pdf' => 'pdf',
            default => 'bin',
        };
    }

    private function guessResponseMimeFromFilename(string $filename, string $fallbackMime): string
    {
        return match (strtolower(pathinfo($filename, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'webm' => 'audio/webm',
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'm4a', 'mp4' => 'audio/mp4',
            'aac' => 'audio/aac',
            default => $fallbackMime,
        };
    }
}
