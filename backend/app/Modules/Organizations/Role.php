<?php

namespace App\Modules\Organizations;

enum Role: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Manager = 'manager';
    case Member = 'member';
    case Viewer = 'viewer';

    public function permissions(): array
    {
        $read = ['organization.view', 'dashboard.view', 'team.view', 'departments.view'];

        return match ($this) {
            self::Owner => [...$read, 'organization.update', 'team.manage', 'departments.manage', 'audit.view', 'ownership.transfer'],
            self::Admin => [...$read, 'organization.update', 'team.manage', 'departments.manage', 'audit.view'],
            self::Manager => [...$read, 'departments.manage'],
            default => $read,
        };
    }
}
