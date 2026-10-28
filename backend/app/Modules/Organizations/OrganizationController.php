<?php

namespace App\Modules\Organizations;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class OrganizationController
{
    public function index(Request $request): array
    {
        return ['data' => Membership::with('organization')->where('user_id', $request->user()->id)->orderBy('id')->get()->map(fn ($m) => [...$m->organization->toArray(), 'role' => $m->role->value, 'permissions' => $m->role->permissions()])];
    }

    public function store(OrganizationRequest $request, OrganizationActions $actions): JsonResponse
    {
        $organization = $actions->create($request->user(), $request->validated());
        $request->session()->put('organization_id', $organization->id);

        return response()->json(['data' => $organization], 201);
    }

    public function show(Request $request): array
    {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('organization.view');

        return ['data' => [...$ctx->organization->toArray(), 'role' => $ctx->membership->role->value, 'permissions' => $ctx->membership->role->permissions()]];
    }

    public function update(OrganizationRequest $request, OrganizationActions $actions): array
    {
        return ['data' => $actions->update(OrganizationContext::from($request), $request->validated())];
    }

    public function switch(Request $request): array
    {
        $ctx = OrganizationContext::from($request);
        $request->session()->put('organization_id', $ctx->organization->id);

        return ['data' => ['organization_id' => $ctx->organization->id]];
    }

    public function dashboard(Request $request): array
    {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('dashboard.view');
        $org = $ctx->organization;

        return ['data' => ['members' => $org->memberships()->count(), 'departments' => $org->departments()->count(), 'pending_invitations' => $org->invitations()->where('expires_at', '>', now())->count(), 'activities' => count($org->activities), 'recent_activity' => in_array('audit.view', $ctx->membership->role->permissions()) ? $org->audits()->latest('id')->limit(6)->get() : []]];
    }

    public function audit(Request $request): LengthAwarePaginator
    {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('audit.view');

        return $ctx->organization->audits()->latest('id')->paginate(30);
    }

    public function transfer(Request $request, OrganizationActions $actions): Response
    {
        $data = $request->validate(['membership_id' => ['required', 'integer']]);
        $actions->transfer(OrganizationContext::from($request), $data['membership_id']);

        return response()->noContent();
    }
}
