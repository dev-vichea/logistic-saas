<?php

use App\Modules\PurchaseOrders\PurchaseOrderController;
use App\Modules\RecordDocuments\RecordDocumentController;
use Illuminate\Support\Facades\Route;

Route::prefix('purchase-orders')->group(function () {
    Route::get('/', [PurchaseOrderController::class, 'index']);
    Route::post('/', [PurchaseOrderController::class, 'store']);
    Route::get('{purchaseOrder}', [PurchaseOrderController::class, 'show'])->whereNumber('purchaseOrder');
    Route::patch('{purchaseOrder}', [PurchaseOrderController::class, 'update'])->whereNumber('purchaseOrder');
    Route::post('{purchaseOrder}/issue', [PurchaseOrderController::class, 'issue'])->whereNumber('purchaseOrder');
    Route::get('{purchaseOrder}/activity', [PurchaseOrderController::class, 'activity'])->whereNumber('purchaseOrder');
    Route::get('{purchaseOrder}/documents', [RecordDocumentController::class, 'listForOrder'])->whereNumber('purchaseOrder');
    Route::post('{purchaseOrder}/documents', [RecordDocumentController::class, 'uploadForOrder'])->whereNumber('purchaseOrder');
    Route::get('{purchaseOrder}/documents/{document}/content', [RecordDocumentController::class, 'contentForOrder'])->whereNumber(['purchaseOrder', 'document']);
    Route::delete('{purchaseOrder}/documents/{document}', [RecordDocumentController::class, 'deleteForOrder'])->whereNumber(['purchaseOrder', 'document']);
});
