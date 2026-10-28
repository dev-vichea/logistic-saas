<?php

namespace App\Modules\Identity;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    public function create(array $input): User
    {
        $input['email'] = mb_strtolower(trim($input['email'] ?? ''));
        Validator::make($input, ['name' => ['required', 'string', 'max:160'], 'email' => ['required', 'email', 'max:254', Rule::unique('users')], 'password' => ['required', 'string', Password::min(12)->letters()->numbers(), 'confirmed']])->validate();

        return User::create(['name' => $input['name'], 'email' => $input['email'], 'password' => $input['password']]);
    }
}
