<?php

namespace App\Providers;

use App\Modules\Identity\CreateNewUser;
use App\Modules\Identity\PasswordResetLinkResponse;
use App\Modules\Identity\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(FailedPasswordResetLinkRequestResponse::class, PasswordResetLinkResponse::class);
        $this->app->bind(SuccessfulPasswordResetLinkRequestResponse::class, PasswordResetLinkResponse::class);
    }

    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        RateLimiter::for('login', fn (Request $r) => Limit::perMinute(5)->by(Str::lower((string) $r->input('email')).'|'.$r->ip()));
        RateLimiter::for('two-factor', fn (Request $r) => Limit::perMinute(5)->by($r->session()->get('login.id')));
    }
}
