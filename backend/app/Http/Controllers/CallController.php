<?php

namespace App\Http\Controllers;

use App\Http\Requests\Calls\AnswerCallRequest;
use App\Http\Requests\Calls\CandidateCallRequest;
use App\Http\Requests\Calls\OfferCallRequest;
use App\Http\Requests\Calls\StoreCallRequest;
use App\Models\CallSession;
use Illuminate\Http\Request;

class CallController extends Controller
{
    private function authorizeParticipant(CallSession $session, int $userId): void
    {
        abort_unless(
            $session->caller_id === $userId || $session->callee_id === $userId,
            403,
            'You are not part of this call session.'
        );
    }

    private function serializeSession(CallSession $session)
    {
        $session->loadMissing([
            'caller:id,name,email',
            'callee:id,name,email',
        ]);

        return response()->json($session);
    }

    public function current(Request $request)
    {
        $userId = $request->user()->id;

        $session = CallSession::with([
                'caller:id,name,email',
                'callee:id,name,email',
            ])
            ->whereIn('status', ['ringing', 'accepted'])
            ->where(function ($query) use ($userId) {
                $query->where('caller_id', $userId)
                    ->orWhere('callee_id', $userId);
            })
            ->latest('id')
            ->first();

        return response()->json($session);
    }

    public function store(StoreCallRequest $request)
    {
        $session = CallSession::create([
            'caller_id' => $request->user()->id,
            'callee_id' => $request->callee_id,
            'type' => $request->type,
            'status' => 'ringing',
            'caller_candidates' => [],
            'callee_candidates' => [],
        ]);

        return $this->serializeSession($session);
    }

    public function show(Request $request, CallSession $call)
    {
        $this->authorizeParticipant($call, $request->user()->id);

        return $this->serializeSession($call);
    }

    public function offer(OfferCallRequest $request, CallSession $call)
    {
        abort_unless($call->caller_id === $request->user()->id, 403, 'Only the caller can send the offer.');

        $call->offer_sdp = $request->offer_sdp;
        $call->save();

        return $this->serializeSession($call);
    }

    public function answer(AnswerCallRequest $request, CallSession $call)
    {
        abort_unless($call->callee_id === $request->user()->id, 403, 'Only the callee can answer this call.');

        $call->answer_sdp = $request->answer_sdp;
        $call->status = 'accepted';
        $call->started_at = now();
        $call->save();

        return $this->serializeSession($call);
    }

    public function candidate(CandidateCallRequest $request, CallSession $call)
    {
        $userId = $request->user()->id;
        $this->authorizeParticipant($call, $userId);

        if ($call->caller_id === $userId) {
            $candidates = $call->caller_candidates ?? [];
            $candidates[] = $request->candidate;
            $call->caller_candidates = $candidates;
        } else {
            $candidates = $call->callee_candidates ?? [];
            $candidates[] = $request->candidate;
            $call->callee_candidates = $candidates;
        }

        $call->save();

        return $this->serializeSession($call);
    }

    public function decline(Request $request, CallSession $call)
    {
        abort_unless($call->callee_id === $request->user()->id, 403, 'Only the callee can decline this call.');

        $call->status = 'declined';
        $call->ended_at = now();
        $call->save();

        return $this->serializeSession($call);
    }

    public function end(Request $request, CallSession $call)
    {
        $this->authorizeParticipant($call, $request->user()->id);

        $call->status = 'ended';
        $call->ended_at = now();
        $call->save();

        return $this->serializeSession($call);
    }
}
