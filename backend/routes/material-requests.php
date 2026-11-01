<?php

use App\Modules\MaterialRequests\MaterialRequestController;
use App\Modules\RecordDocuments\RecordDocumentController;
use Illuminate\Support\Facades\Route;

Route::prefix('material-requests')->group(function () {
    Route::get('/', [MaterialRequestController::class, 'index']);
    Route::post('/', [MaterialRequestController::class, 'store']);
    Route::get('{materialRequest}', [MaterialRequestController::class, 'show'])->whereNumber('materialRequest');
    Route::patch('{materialRequest}', [MaterialRequestController::class, 'update'])->whereNumber('materialRequest');
    Route::post('{materialRequest}/submit', [MaterialRequestController::class, 'submit'])->whereNumber('materialRequest');
    Route::get('{materialRequest}/activity', [MaterialRequestController::class, 'activity'])->whereNumber('materialRequest');
    Route::get('{materialRequest}/documents', [RecordDocumentController::class, 'listForRequest'])->whereNumber('materialRequest');
    Route::post('{materialRequest}/documents', [RecordDocumentController::class, 'uploadForRequest'])->whereNumber('materialRequest');
    Route::get('{materialRequest}/documents/{document}/content', [RecordDocumentController::class, 'contentForRequest'])->whereNumber(['materialRequest', 'document']);
    Route::delete('{materialRequest}/documents/{document}', [RecordDocumentController::class, 'deleteForRequest'])->whereNumber(['materialRequest', 'document']);
});
