<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add status fields to messages table
        Schema::table('messages', function (Blueprint $table) {
            $table->enum('status', ['sent', 'delivered', 'read'])->default('sent')->after('media_url');
            $table->timestamp('delivered_at')->nullable()->after('status');
            $table->timestamp('read_at')->nullable()->after('delivered_at');
        });

        // Add online status to users table
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_online')->default(false)->after('password');
            $table->timestamp('last_seen_at')->nullable()->after('is_online');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['status', 'delivered_at', 'read_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_online', 'last_seen_at']);
        });
    }
};
