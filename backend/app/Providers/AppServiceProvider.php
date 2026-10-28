<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        VerifyEmail::createUrlUsing(function ($user) {
            $signed = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), ['id' => $user->getKey(), 'hash' => sha1($user->getEmailForVerification())]);

            return config('platform.frontend_url').'/verify-email?verification_url='.urlencode($signed);
        });
        ResetPassword::createUrlUsing(fn ($user, $token) => config('platform.frontend_url').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->getEmailForPasswordReset()]));
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($r->user()?->id ?? $r->ip()));
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(20)->by($r->ip()));
        RateLimiter::for('organizations', fn (Request $r) => Limit::perHour(20)->by($r->user()->id));
        RateLimiter::for('invitations', fn (Request $r) => Limit::perMinute(10)->by($r->user()->id));
    }
}
