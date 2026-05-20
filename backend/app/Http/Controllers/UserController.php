<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
    // Get all users except the authenticated user
    public function index(Request $request)
    {
        $select = ['id', 'name', 'email', 'created_at'];
        $supportsPresence = $this->supportsPresenceColumns();

        if ($supportsPresence) {
            $select[] = 'is_online';
            $select[] = 'last_seen_at';
        }

        $users = User::where('id', '!=', $request->user()->id)
            ->select($select)
            ->orderBy('name', 'asc')
            ->get();

        if (!$supportsPresence) {
            $users->transform(function (User $user) {
                $user->is_online = false;
                $user->last_seen_at = null;
                return $user;
            });

            return response()->json($users);
        }

        $presenceCutoff = now()->subSeconds(45);

        $users->transform(function (User $user) use ($presenceCutoff) {
            $user->is_online = (bool) $user->is_online
                && $user->last_seen_at !== null
                && $user->last_seen_at->greaterThan($presenceCutoff);

            return $user;
        });

        return response()->json($users);
    }

    public function heartbeat(Request $request)
    {
        if (!$this->supportsPresenceColumns()) {
            return response()->json([
                'ok' => false,
                'message' => 'Presence columns are not available in this database yet.',
            ]);
        }

        $request->user()->forceFill([
            'is_online' => true,
            'last_seen_at' => now(),
        ])->save();

        return response()->json([
            'ok' => true,
            'last_seen_at' => $request->user()->last_seen_at,
        ]);
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
}
