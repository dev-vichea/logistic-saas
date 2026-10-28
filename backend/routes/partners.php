<?php

use App\Modules\Locations\LocationController;
use App\Modules\Partners\PartnerContactController;
use App\Modules\Partners\PartnerController;
use Illuminate\Support\Facades\Route;

Route::prefix('partners')->group(function () {
    Route::get('catalog', [PartnerController::class, 'catalog']);
    Route::get('/', [PartnerController::class, 'index']);
    Route::post('/', [PartnerController::class, 'store']);
    Route::prefix('{partner}')->whereNumber('partner')->group(function () {
        Route::get('/', [PartnerController::class, 'show']);
        Route::patch('/', [PartnerController::class, 'update']);
        Route::post('archive', [PartnerController::class, 'archive']);
        Route::post('restore', [PartnerController::class, 'restore']);
        Route::get('contacts', [PartnerContactController::class, 'index']);
        Route::post('contacts', [PartnerContactController::class, 'store']);
        Route::get('contacts/{contact}', [PartnerContactController::class, 'show'])->whereNumber('contact');
        Route::patch('contacts/{contact}', [PartnerContactController::class, 'update'])->whereNumber('contact');
        Route::delete('contacts/{contact}', [PartnerContactController::class, 'destroy'])->whereNumber('contact');
        Route::get('locations', [LocationController::class, 'index']);
        Route::post('locations', [LocationController::class, 'store']);
        Route::get('locations/{location}', [LocationController::class, 'show'])->whereNumber('location');
        Route::patch('locations/{location}', [LocationController::class, 'update'])->whereNumber('location');
        Route::delete('locations/{location}', [LocationController::class, 'destroy'])->whereNumber('location');
    });
});
