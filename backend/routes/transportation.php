<?php

use App\Modules\Transportation\DispatchTripController;
use App\Modules\Transportation\DriverController;
use App\Modules\Transportation\ProofOfDeliveryController;
use App\Modules\Transportation\TransportationCatalogController;
use App\Modules\Transportation\VehicleController;
use Illuminate\Support\Facades\Route;

Route::prefix('transport')->group(function () {
    Route::get('catalog', [TransportationCatalogController::class, 'index']);

    // Vehicles & Fleet
    Route::get('vehicles', [VehicleController::class, 'index']);
    Route::post('vehicles', [VehicleController::class, 'store']);
    Route::get('vehicles/{vehicle}', [VehicleController::class, 'show'])->whereNumber('vehicle');
    Route::patch('vehicles/{vehicle}', [VehicleController::class, 'update'])->whereNumber('vehicle');

    // Drivers Registry
    Route::get('drivers', [DriverController::class, 'index']);
    Route::post('drivers', [DriverController::class, 'store']);
    Route::get('drivers/{driver}', [DriverController::class, 'show'])->whereNumber('driver');
    Route::patch('drivers/{driver}', [DriverController::class, 'update'])->whereNumber('driver');

    // Dispatch Trips & Run-Sheets
    Route::get('trips', [DispatchTripController::class, 'index']);
    Route::post('trips', [DispatchTripController::class, 'store']);
    Route::get('trips/{trip}', [DispatchTripController::class, 'show'])->whereNumber('trip');
    Route::patch('trips/{trip}', [DispatchTripController::class, 'update'])->whereNumber('trip');
    Route::post('trips/{trip}/dispatch', [DispatchTripController::class, 'dispatch'])->whereNumber('trip');
    Route::post('trips/{trip}/cancel', [DispatchTripController::class, 'cancel'])->whereNumber('trip');
    Route::post('trips/{trip}/pod', [ProofOfDeliveryController::class, 'store'])->whereNumber('trip');

    // Proof of Deliveries
    Route::get('pods/{pod}', [ProofOfDeliveryController::class, 'show'])->whereNumber('pod');
});
