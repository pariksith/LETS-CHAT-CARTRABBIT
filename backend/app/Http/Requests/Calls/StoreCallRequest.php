<?php

namespace App\Http\Requests\Calls;

use Illuminate\Foundation\Http\FormRequest;

class StoreCallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'callee_id' => 'required|exists:users,id|different:' . $this->user()->id,
            'type' => 'required|in:voice,video',
        ];
    }
}
