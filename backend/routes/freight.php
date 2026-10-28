<?php

use App\Modules\Freight\BookingController;
use App\Modules\Freight\FreightCatalogController;
use App\Modules\Freight\FreightRequestController;
use App\Modules\Freight\QuotationController;
use App\Modules\Freight\ShipmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('freight')->group(function () {
    Route::get('catalog', [FreightCatalogController::class, 'index']);

    // Requests
    Route::get('requests', [FreightRequestController::class, 'index']);
    Route::post('requests', [FreightRequestController::class, 'store']);
    Route::get('requests/{freightRequest}', [FreightRequestController::class, 'show'])->whereNumber('freightRequest');
    Route::patch('requests/{freightRequest}', [FreightRequestController::class, 'update'])->whereNumber('freightRequest');

    // Quotations
    Route::get('quotations', [QuotationController::class, 'index']);
    Route::post('quotations', [QuotationController::class, 'store']);
    Route::get('quotations/{quotation}', [QuotationController::class, 'show'])->whereNumber('quotation');
    Route::post('quotations/{quotation}/revise', [QuotationController::class, 'revise'])->whereNumber('quotation');
    Route::post('quotations/{quotation}/status', [QuotationController::class, 'updateStatus'])->whereNumber('quotation');

    // Bookings
    Route::get('bookings', [BookingController::class, 'index']);
    Route::post('bookings', [BookingController::class, 'store']);
    Route::get('bookings/{booking}', [BookingController::class, 'show'])->whereNumber('booking');
    Route::patch('bookings/{booking}', [BookingController::class, 'update'])->whereNumber('booking');

    // Shipments
    Route::get('shipments', [ShipmentController::class, 'index']);
    Route::post('shipments', [ShipmentController::class, 'store']);
    Route::prefix('shipments/{shipment}')->whereNumber('shipment')->group(function () {
        Route::get('/', [ShipmentController::class, 'show']);
        Route::patch('/', [ShipmentController::class, 'update']);
        Route::post('milestones', [ShipmentController::class, 'addMilestone']);
        Route::post('legs', [ShipmentController::class, 'storeLeg']);
        Route::patch('legs/{leg}', [ShipmentController::class, 'updateLeg'])->whereNumber('leg');
        Route::post('cargo-items', [ShipmentController::class, 'storeCargoItem']);
        Route::patch('cargo-items/{item}', [ShipmentController::class, 'updateCargoItem'])->whereNumber('item');
        Route::delete('cargo-items/{item}', [ShipmentController::class, 'destroyCargoItem'])->whereNumber('item');
    });
});
