<?php

namespace App\Modules\MaterialRequests;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialRequestController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('material_requests.view');
        $query = $context->organization->materialRequests()->with(['requestedBy:id,name', 'purchaseOrder:id,organization_id,material_request_id,po_number,status'])->withCount('items');

        if ($request->filled('status')) {
            abort_unless(in_array($request->query('status'), ['draft', 'submitted'], true), 422, 'Invalid status.');
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('q')) {
            $search = mb_substr(trim($request->query('q')), 0, 100);
            $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';
            $query->where(function (Builder $query) use ($pattern) {
                $query->where('request_number', 'ilike', $pattern)
                    ->orWhere('title', 'ilike', $pattern);
            });
        }

        return $query->orderByDesc('id')->paginate(min(100, max(1, $request->integer('per_page', 25))));
    }

    public function show(Request $request, int $organization, int $materialRequest): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('material_requests.view');

        return ['data' => $context->organization->materialRequests()
            ->with(['items', 'requestedBy:id,name', 'purchaseOrder:id,organization_id,material_request_id,po_number,status'])
            ->findOrFail($materialRequest)];
    }

    public function activity(Request $request, int $organization, int $materialRequest): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('material_requests.view');
        $context->organization->materialRequests()->findOrFail($materialRequest);

        return ['data' => $context->organization->audits()
            ->leftJoin('users', 'users.id', '=', 'audit_events.actor_id')
            ->whereRaw("(metadata->>'material_request_id')::bigint = ?", [$materialRequest])
            ->select('audit_events.id', 'audit_events.action', 'audit_events.created_at', 'users.name as actor_name')
            ->orderByDesc('audit_events.id')->limit(100)->get()];
    }

    public function store(MaterialRequestFormRequest $request, MaterialRequestActions $actions): JsonResponse
    {
        $created = $actions->create(OrganizationContext::from($request), $request->validated());

        return response()->json(['data' => $created], 201);
    }

    public function update(MaterialRequestFormRequest $request, int $organization, int $materialRequest, MaterialRequestActions $actions): array
    {
        return ['data' => $actions->update(OrganizationContext::from($request), $materialRequest, $request->validated())];
    }

    public function submit(Request $request, int $organization, int $materialRequest, MaterialRequestActions $actions): array
    {
        return ['data' => $actions->submit(OrganizationContext::from($request), $materialRequest)];
    }
}
