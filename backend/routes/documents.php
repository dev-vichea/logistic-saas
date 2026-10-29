<?php

use App\Modules\Documents\DocumentCatalogController;
use App\Modules\Documents\DocumentReconciliationController;
use App\Modules\Documents\TradeDocumentController;
use App\Modules\Documents\TradeDocumentItemController;
use Illuminate\Support\Facades\Route;

Route::prefix('documents')->group(function () {
    Route::get('catalog', [DocumentCatalogController::class, 'options']);

    // Trade Documents Vault
    Route::get('/', [TradeDocumentController::class, 'index']);
    Route::post('/', [TradeDocumentController::class, 'store']);
    Route::get('{document}', [TradeDocumentController::class, 'show'])->whereNumber('document');
    Route::patch('{document}', [TradeDocumentController::class, 'update'])->whereNumber('document');
    Route::delete('{document}', [TradeDocumentController::class, 'destroy'])->whereNumber('document');
    Route::post('{document}/verify', [TradeDocumentController::class, 'verify'])->whereNumber('document');
    Route::post('{document}/push-to-cargo', [TradeDocumentController::class, 'pushToCargo'])->whereNumber('document');

    // Document Line Items
    Route::patch('{document}/items/{item}', [TradeDocumentItemController::class, 'update'])
        ->whereNumber('document')
        ->whereNumber('item');

    // Cross-Document Reconciliation
    Route::get('reconciliations', [DocumentReconciliationController::class, 'index']);
    Route::post('reconciliations', [DocumentReconciliationController::class, 'store']);
    Route::get('reconciliations/{reconciliation}', [DocumentReconciliationController::class, 'show'])->whereNumber('reconciliation');
    Route::post('reconciliations/{reconciliation}/resolve', [DocumentReconciliationController::class, 'resolve'])->whereNumber('reconciliation');
});
