<?php

namespace App\Modules\Team;

use App\Modules\Audit\Audit;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;

final class DepartmentActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function create(OrganizationContext $context, array $data): Department
    {
        return $this->organizations->mutate($context, 'departments.manage', function (Organization $organization) use ($data) {
            $department = $organization->departments()->create($data);
            Audit::record($organization, 'department.created', ['department_id' => $department->id]);

            return $department;
        });
    }

    public function update(OrganizationContext $context, int $id, array $data): Department
    {
        return $this->organizations->mutate($context, 'departments.manage', function (Organization $organization) use ($id, $data) {
            $department = $organization->departments()->findOrFail($id);
            $department->update($data);
            Audit::record($organization, 'department.updated', ['department_id' => $department->id]);

            return $department;
        });
    }

    public function delete(OrganizationContext $context, int $id): void
    {
        $this->organizations->mutate($context, 'departments.manage', function (Organization $organization) use ($id) {
            $department = $organization->departments()->findOrFail($id);
            $organization->memberships()->where('department_id', $id)->update(['department_id' => null]);
            $organization->invitations()->where('department_id', $id)->update(['department_id' => null]);
            $department->delete();
            Audit::record($organization, 'department.deleted', ['department_id' => $id]);
        });
    }
}
