<?php

use App\Modules\Customs\CdcMasterListController;
use App\Modules\Customs\CdcQuotaDeductionController;
use App\Modules\Customs\CustomsCatalogController;
use App\Modules\Customs\CustomsDeclarationController;
use Illuminate\Support\Facades\Route;

Route::prefix('customs')->group(function () {
    Route::get('catalog', [CustomsCatalogController::class, 'options']);

    // CDC Master Lists & QIP Quotas
    Route::get('cdc-master-lists', [CdcMasterListController::class, 'index']);
    Route::post('cdc-master-lists', [CdcMasterListController::class, 'store']);
    Route::get('cdc-master-lists/{masterList}', [CdcMasterListController::class, 'show'])->whereNumber('masterList');
    Route::post('cdc-master-lists/{masterList}/items', [CdcMasterListController::class, 'addItem'])->whereNumber('masterList');

    // ASYCUDA Declarations
    Route::get('declarations', [CustomsDeclarationController::class, 'index']);
    Route::post('declarations', [CustomsDeclarationController::class, 'store']);
    Route::get('declarations/{declaration}', [CustomsDeclarationController::class, 'show'])->whereNumber('declaration');
    Route::patch('declarations/{declaration}', [CustomsDeclarationController::class, 'update'])->whereNumber('declaration');
    Route::delete('declarations/{declaration}', [CustomsDeclarationController::class, 'destroy'])->whereNumber('declaration');
    Route::post('declarations/{declaration}/transition', [CustomsDeclarationController::class, 'transition'])->whereNumber('declaration');
    Route::post('declarations/{declaration}/deduct-quota', [CdcQuotaDeductionController::class, 'deduct'])->whereNumber('declaration');

    // Quota Deductions Log
    Route::get('deductions', [CdcQuotaDeductionController::class, 'index']);
});
