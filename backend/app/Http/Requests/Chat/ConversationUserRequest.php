<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class ConversationUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'conversation_user_id' => $this->route('user')?->id,
        ]);
    }

    public function rules(): array
    {
        return [
            'conversation_user_id' => 'required|exists:users,id|different:' . $this->user()->id,
        ];
    }
}
