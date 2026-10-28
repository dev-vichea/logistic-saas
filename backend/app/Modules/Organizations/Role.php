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
        $read = ['organization.view', 'dashboard.view', 'team.view', 'departments.view', 'partners.view', 'freight.view'];

        return match ($this) {
            self::Owner => [...$read, 'organization.update', 'team.manage', 'departments.manage', 'audit.view', 'ownership.transfer', 'partners.manage', 'partners.archive', 'freight.manage', 'freight.cancel'],
            self::Admin => [...$read, 'organization.update', 'team.manage', 'departments.manage', 'audit.view', 'partners.manage', 'partners.archive', 'freight.manage', 'freight.cancel'],
            self::Manager => [...$read, 'departments.manage', 'partners.manage', 'partners.archive', 'freight.manage', 'freight.cancel'],
            self::Member => [...$read, 'partners.manage', 'freight.manage'],
            default => $read,
        };
    }
}
