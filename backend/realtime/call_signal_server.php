<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Laravel\Sanctum\PersonalAccessToken;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

const DEFAULT_SIGNAL_HOST = '127.0.0.1';
const DEFAULT_SIGNAL_PORT = 8081;

$host = $argv[1] ?? DEFAULT_SIGNAL_HOST;
$port = (int) ($argv[2] ?? DEFAULT_SIGNAL_PORT);
$server = stream_socket_server(
    sprintf('tcp://%s:%d', $host, $port),
    $errorCode,
    $errorMessage
);

if ($server === false) {
    fwrite(STDERR, sprintf("Unable to start signaling server: [%d] %s\n", $errorCode, $errorMessage));
    exit(1);
}

stream_set_blocking($server, false);

$clients = [];
$userSockets = [];

fwrite(STDOUT, sprintf("Call signaling WebSocket listening on ws://%s:%d\n", $host, $port));

while (true) {
    $readSockets = [$server];

    foreach ($clients as $client) {
      $readSockets[] = $client['socket'];
    }

    $writeSockets = null;
    $exceptSockets = null;

    if (@stream_select($readSockets, $writeSockets, $exceptSockets, null) === false) {
        continue;
    }

    foreach ($readSockets as $socket) {
        if ($socket === $server) {
            $connection = @stream_socket_accept($server, 0);

            if ($connection === false) {
                continue;
            }

            stream_set_blocking($connection, false);

            $clients[(int) $connection] = [
                'socket' => $connection,
                'buffer' => '',
                'handshake_complete' => false,
                'user_id' => null,
            ];
            continue;
        }

        $clientId = (int) $socket;
        $chunk = @fread($socket, 8192);

        if ($chunk === '' || $chunk === false) {
            if (feof($socket)) {
                disconnectClient($clientId, $clients, $userSockets);
            }
            continue;
        }

        $clients[$clientId]['buffer'] .= $chunk;

        if ($clients[$clientId]['handshake_complete'] === false) {
            if (str_contains($clients[$clientId]['buffer'], "\r\n\r\n")) {
                completeHandshake($clients[$clientId]);
            }
            continue;
        }

        processClientFrames($clientId, $clients, $userSockets);
    }
}

function completeHandshake(array &$client): void
{
    if (!preg_match("/Sec-WebSocket-Key: (.*)\r\n/i", $client['buffer'], $matches)) {
        fclose($client['socket']);
        return;
    }

    $key = trim($matches[1]);
    $acceptKey = base64_encode(
        sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true)
    );

    $response = implode("\r\n", [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' . $acceptKey,
        '',
        '',
    ]);

    fwrite($client['socket'], $response);
    $client['handshake_complete'] = true;
    $client['buffer'] = '';
}

function processClientFrames(int $clientId, array &$clients, array &$userSockets): void
{
    while (true) {
        $frame = extractFrame($clients[$clientId]['buffer']);

        if ($frame === null) {
            return;
        }

        if ($frame['opcode'] === 0x8) {
            disconnectClient($clientId, $clients, $userSockets);
            return;
        }

        if ($frame['opcode'] === 0x9) {
            sendFrame($clients[$clientId]['socket'], $frame['payload'], 0xA);
            continue;
        }

        if ($frame['opcode'] !== 0x1) {
            continue;
        }

        $payload = json_decode($frame['payload'], true);

        if (!is_array($payload)) {
            sendJson($clients[$clientId]['socket'], [
                'type' => 'error',
                'message' => 'Invalid signaling payload.',
            ]);
            continue;
        }

        handleSignalMessage($clientId, $payload, $clients, $userSockets);
    }
}

function handleSignalMessage(int $clientId, array $payload, array &$clients, array &$userSockets): void
{
    $type = $payload['type'] ?? '';

    if ($type === 'auth') {
        $token = is_string($payload['token'] ?? null) ? trim($payload['token']) : '';
        $user = authenticateToken($token);

        if (!$user) {
            sendJson($clients[$clientId]['socket'], [
                'type' => 'auth.error',
                'message' => 'Invalid token.',
            ]);
            disconnectClient($clientId, $clients, $userSockets);
            return;
        }

        $clients[$clientId]['user_id'] = $user['id'];
        $userSockets[$user['id']][$clientId] = true;

        sendJson($clients[$clientId]['socket'], [
            'type' => 'auth.ok',
            'user' => $user,
        ]);
        return;
    }

    if (!$clients[$clientId]['user_id']) {
        sendJson($clients[$clientId]['socket'], [
            'type' => 'auth.error',
            'message' => 'Authenticate before signaling.',
        ]);
        disconnectClient($clientId, $clients, $userSockets);
        return;
    }

    $toUserId = (int) ($payload['toUserId'] ?? 0);

    if ($toUserId < 1 || empty($userSockets[$toUserId])) {
        return;
    }

    $relayPayload = $payload;
    unset($relayPayload['toUserId'], $relayPayload['token']);
    $relayPayload['fromUserId'] = $clients[$clientId]['user_id'];
    $relayPayload['serverTime'] = now()->toIso8601String();

    foreach (array_keys($userSockets[$toUserId]) as $targetClientId) {
        if (!isset($clients[$targetClientId])) {
            continue;
        }

        sendJson($clients[$targetClientId]['socket'], $relayPayload);
    }
}

function authenticateToken(string $plainTextToken): ?array
{
    if ($plainTextToken === '') {
        return null;
    }

    $token = PersonalAccessToken::findToken($plainTextToken);

    if (!$token || !$token->tokenable) {
        return null;
    }

    $user = $token->tokenable->fresh(['id', 'name', 'email']);

    if (!$user) {
        return null;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
    ];
}

function extractFrame(string &$buffer): ?array
{
    $bufferLength = strlen($buffer);

    if ($bufferLength < 2) {
        return null;
    }

    $firstByte = ord($buffer[0]);
    $secondByte = ord($buffer[1]);
    $opcode = $firstByte & 0x0F;
    $masked = ($secondByte & 0x80) === 0x80;
    $payloadLength = $secondByte & 0x7F;
    $offset = 2;

    if ($payloadLength === 126) {
        if ($bufferLength < 4) {
            return null;
        }

        $payloadLength = unpack('n', substr($buffer, 2, 2))[1];
        $offset = 4;
    } elseif ($payloadLength === 127) {
        if ($bufferLength < 10) {
            return null;
        }

        $extended = unpack('N2', substr($buffer, 2, 8));
        $payloadLength = ($extended[1] << 32) | $extended[2];
        $offset = 10;
    }

    $maskKey = '';

    if ($masked) {
        if ($bufferLength < $offset + 4) {
            return null;
        }

        $maskKey = substr($buffer, $offset, 4);
        $offset += 4;
    }

    if ($bufferLength < $offset + $payloadLength) {
        return null;
    }

    $payload = substr($buffer, $offset, $payloadLength);
    $buffer = substr($buffer, $offset + $payloadLength);

    if ($masked) {
        $payload = unmaskPayload($payload, $maskKey);
    }

    return [
        'opcode' => $opcode,
        'payload' => $payload,
    ];
}

function unmaskPayload(string $payload, string $maskKey): string
{
    $decoded = '';
    $payloadLength = strlen($payload);

    for ($index = 0; $index < $payloadLength; $index++) {
        $decoded .= $payload[$index] ^ $maskKey[$index % 4];
    }

    return $decoded;
}

function sendJson($socket, array $payload): void
{
    sendFrame($socket, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

function sendFrame($socket, string $payload, int $opcode = 0x1): void
{
    $payloadLength = strlen($payload);
    $frame = chr(0x80 | ($opcode & 0x0F));

    if ($payloadLength < 126) {
        $frame .= chr($payloadLength);
    } elseif ($payloadLength <= 65535) {
        $frame .= chr(126) . pack('n', $payloadLength);
    } else {
        $frame .= chr(127) . pack('NN', 0, $payloadLength);
    }

    $frame .= $payload;
    @fwrite($socket, $frame);
}

function disconnectClient(int $clientId, array &$clients, array &$userSockets): void
{
    if (!isset($clients[$clientId])) {
        return;
    }

    $userId = $clients[$clientId]['user_id'];

    if ($userId && isset($userSockets[$userId][$clientId])) {
        unset($userSockets[$userId][$clientId]);

        if (empty($userSockets[$userId])) {
            unset($userSockets[$userId]);
        }
    }

    @fclose($clients[$clientId]['socket']);
    unset($clients[$clientId]);
}
