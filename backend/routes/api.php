<?php

use App\Modules\Organizations\Membership;
use App\Modules\Organizations\OrganizationController;
use App\Modules\Organizations\ResolveOrganization;
use App\Modules\Organizations\Role;
use App\Modules\Team\DepartmentController;
use App\Modules\Team\TeamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {
    Route::get('me', function (Request $r) {
        $ids = Membership::where('user_id', $r->user()->id)->pluck('organization_id');
        $selected = $r->session()->get('organization_id');

        return ['data' => ['user' => $r->user(), 'organization_id' => $ids->contains($selected) ? $selected : $ids->first()]];
    });
    Route::middleware(['verified', 'throttle:api'])->group(function () {
        Route::get('catalog', fn () => ['data' => ['countries' => config('platform.countries'), 'currencies' => config('platform.currencies'), 'activities' => config('platform.activities'), 'roles' => collect(Role::cases())->map(fn ($role) => ['value' => $role->value, 'permissions' => $role->permissions()])]]);
        Route::get('organizations', [OrganizationController::class, 'index']);
        Route::post('organizations', [OrganizationController::class, 'store'])->middleware('throttle:organizations');
        Route::post('invitations/accept', [TeamController::class, 'accept'])->middleware('throttle:invitations');
        Route::prefix('organizations/{organization}')->whereNumber('organization')->middleware(ResolveOrganization::class)->group(function () {
            Route::get('/', [OrganizationController::class, 'show']);
            Route::patch('/', [OrganizationController::class, 'update']);
            Route::post('switch', [OrganizationController::class, 'switch']);
            Route::post('transfer-ownership', [OrganizationController::class, 'transfer']);
            Route::get('dashboard', [OrganizationController::class, 'dashboard']);
            Route::get('audit-events', [OrganizationController::class, 'audit']);
            Route::get('members', [TeamController::class, 'index']);
            Route::patch('members/{member}', [TeamController::class, 'update'])->whereNumber('member');
            Route::delete('members/{member}', [TeamController::class, 'destroy'])->whereNumber('member');
            Route::get('invitations', [TeamController::class, 'invitations']);
            Route::post('invitations', [TeamController::class, 'invite'])->middleware('throttle:invitations');
            Route::delete('invitations/{invitation}', [TeamController::class, 'revoke'])->whereNumber('invitation');
            Route::get('departments', [DepartmentController::class, 'index']);
            Route::post('departments', [DepartmentController::class, 'store']);
            Route::patch('departments/{department}', [DepartmentController::class, 'update'])->whereNumber('department');
            Route::delete('departments/{department}', [DepartmentController::class, 'destroy'])->whereNumber('department');
        });
    });
});
