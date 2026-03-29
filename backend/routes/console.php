<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('Backend is booting normally.');
})->purpose('Confirm Artisan commands are loaded');
