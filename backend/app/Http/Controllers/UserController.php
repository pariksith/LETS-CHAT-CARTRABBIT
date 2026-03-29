<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    // Get all users except the authenticated user
    public function index(Request $request)
    {
        $users = User::where('id', '!=', $request->user()->id)
                     ->select('id', 'name', 'email', 'created_at')
                     ->orderBy('name', 'asc')
                     ->get();

        return response()->json($users);
    }
}
