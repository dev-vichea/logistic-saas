<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\QueuedResetPassword as ResetPassword;
use App\Notifications\QueuedVerifyEmail as VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        Notification::fake();
    }

    public function test_registration_logs_in_and_sends_verification(): void
    {
        $this->postJson('/api/v1/auth/register', ['name' => 'Dara Sok', 'email' => 'DARA@example.com', 'password' => 'SecurePassword123', 'password_confirmation' => 'SecurePassword123'])->assertCreated();
        $user = User::first();
        $this->assertSame('dara@example.com', $user->email);
        $this->assertTrue(Hash::check('SecurePassword123', $user->password));
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
        $this->getJson('/api/v1/me')->assertOk()->assertJsonMissingPath('data.user.password');
        $this->getJson('/api/v1/organizations')->assertForbidden();
    }

    public function test_registration_validates_password_and_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dara@example.com']);
        $this->postJson('/api/v1/auth/register', ['name' => 'Dara', 'email' => 'DARA@example.com', 'password' => 'weak', 'password_confirmation' => 'wrong'])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_and_logout_use_session_authentication(): void
    {
        User::factory()->create(['email' => 'dara@example.com', 'password' => 'SecurePassword123']);
        $this->postJson('/api/v1/auth/login', ['email' => 'DARA@example.com', 'password' => 'bad'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', ['email' => 'DARA@example.com', 'password' => 'SecurePassword123'])->assertOk();
        $this->getJson('/api/v1/me')->assertOk();
        $this->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->assertGuest('web');
        app('auth')->forgetGuards();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'locked@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'locked@example.com', 'password' => 'wrong'])->assertTooManyRequests();
    }

    public function test_verification_requires_valid_signature_and_matching_user(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->actingAs(User::factory()->unverified()->create())->getJson($url)->assertForbidden();
        $this->actingAs($user)->getJson($url.'&tampered=true')->assertForbidden();
        $this->getJson($url)->assertNoContent();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_expired_verification_link_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->actingAs($user)->getJson($url)->assertForbidden();
    }

    public function test_password_reset_changes_password_and_token_is_single_use(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });
        $payload = ['email' => $user->email, 'token' => $token, 'password' => 'NewSecurePassword123', 'password_confirmation' => 'NewSecurePassword123'];
        $this->postJson('/api/v1/auth/reset-password', $payload)->assertOk();
        $this->assertTrue(Hash::check($payload['password'], $user->fresh()->password));
        $this->postJson('/api/v1/auth/reset-password', $payload)->assertUnprocessable();
    }

    public function test_password_reset_does_not_disclose_account_existence(): void
    {
        $known = User::factory()->create();
        $existing = $this->postJson('/api/v1/auth/forgot-password', ['email' => $known->email])->assertOk()->json();
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'unknown@example.com'])->assertOk()->json();
        $this->assertSame($existing, $unknown);
    }

    public function test_invalid_reset_token_never_changes_password(): void
    {
        $user = User::factory()->create();
        $before = $user->password;
        $this->postJson('/api/v1/auth/reset-password', ['email' => $user->email, 'token' => 'invalid', 'password' => 'NewSecurePassword123', 'password_confirmation' => 'NewSecurePassword123'])->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->password);
    }
}
