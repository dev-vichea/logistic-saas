<?php

use Laravel\Fortify\Features;

return [
    'guard' => 'web', 'passwords' => 'users', 'username' => 'email', 'email' => 'email',
    'lowercase_usernames' => true, 'home' => '/', 'prefix' => 'api/v1/auth', 'domain' => null,
    'middleware' => ['web', 'throttle:auth'], 'views' => false,
    'limiters' => ['login' => 'login', 'two-factor' => 'two-factor'],
    'features' => [Features::registration(), Features::resetPasswords(), Features::emailVerification()],
];
