<?php

namespace App\Modules\Identity;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    public function reset(User $user, array $input): void
    {
        Validator::make($input, ['password' => ['required', 'string', Password::min(12)->letters()->numbers(), 'confirmed']])->validate();
        $user->forceFill(['password' => $input['password']])->save();
    }
}
