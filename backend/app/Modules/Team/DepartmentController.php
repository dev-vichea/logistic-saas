<?php

namespace App\Modules\Team;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DepartmentController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('departments.view');

        return $context->organization->departments()->orderBy('name')->paginate(100);
    }

    public function store(DepartmentRequest $request, DepartmentActions $actions): JsonResponse
    {
        return response()->json(['data' => $actions->create(OrganizationContext::from($request), $request->validated())], 201);
    }

    public function update(DepartmentRequest $request, int $organization, int $department, DepartmentActions $actions): array
    {
        return ['data' => $actions->update(OrganizationContext::from($request), $department, $request->validated())];
    }

    public function destroy(Request $request, int $organization, int $department, DepartmentActions $actions): Response
    {
        $actions->delete(OrganizationContext::from($request), $department);

        return response()->noContent();
    }
}
