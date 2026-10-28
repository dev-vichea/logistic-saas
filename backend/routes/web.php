<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['service' => 'Mekong Logistics API', 'version' => '0.2.0']));
