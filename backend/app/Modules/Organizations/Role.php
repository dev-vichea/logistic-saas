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
        $read = ['organization.view', 'dashboard.view', 'team.view', 'departments.view', 'partners.view', 'freight.view', 'transport.view', 'documents.view', 'customs.view'];

        $customsOps = ['customs.manage', 'customs.declare', 'customs.deduct_cdc'];

        return match ($this) {
            self::Owner => [...$read, 'organization.update', 'team.manage', 'departments.manage', 'audit.view', 'ownership.transfer', 'partners.manage', 'partners.archive', 'freight.manage', 'freight.cancel', 'transport.manage', 'transport.cancel', 'documents.upload', 'documents.verify', 'documents.delete', ...$customsOps],
            self::Admin => [...$read, 'organization.update', 'team.manage', 'departments.manage', 'audit.view', 'partners.manage', 'partners.archive', 'freight.manage', 'freight.cancel', 'transport.manage', 'transport.cancel', 'documents.upload', 'documents.verify', 'documents.delete', ...$customsOps],
            self::Manager => [...$read, 'departments.manage', 'partners.manage', 'partners.archive', 'freight.manage', 'freight.cancel', 'transport.manage', 'transport.cancel', 'documents.upload', 'documents.verify', 'documents.delete', ...$customsOps],
            self::Member => [...$read, 'partners.manage', 'freight.manage', 'transport.manage', 'documents.upload', 'documents.verify', ...$customsOps],
            default => $read,
        };
    }
}
