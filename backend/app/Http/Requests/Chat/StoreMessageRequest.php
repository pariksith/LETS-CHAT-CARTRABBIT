<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'receiver_id' => 'required|exists:users,id|different:' . $this->user()->id,
            'type' => 'nullable|in:text,gif,sticker,image,file',
            'content' => 'required_without:media_url|nullable|string|max:5000',
            'media_url' => 'required_without:content|nullable|string|max:200000',
        ];
    }
}
