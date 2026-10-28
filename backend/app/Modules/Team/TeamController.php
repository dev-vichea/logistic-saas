<?php

namespace App\Modules\Team;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TeamController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('team.view');

        return $ctx->organization->memberships()->with('user:id,name,email', 'department')->orderBy('id')->paginate(30);
    }

    public function update(TeamRequest $request, int $organization, int $member, TeamActions $actions): array
    {
        return ['data' => $actions->update(OrganizationContext::from($request), $member, $request->validated())];
    }

    public function destroy(Request $request, int $organization, int $member, TeamActions $actions): Response
    {
        $actions->remove(OrganizationContext::from($request), $member);

        return response()->noContent();
    }

    public function invitations(Request $request): LengthAwarePaginator
    {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('team.manage');

        return $ctx->organization->invitations()->latest('id')->paginate(30);
    }

    public function invite(TeamRequest $request, TeamActions $actions): JsonResponse
    {
        return response()->json(['data' => $actions->invite(OrganizationContext::from($request), $request->validated())], 201);
    }

    public function revoke(Request $request, int $organization, int $invitation, TeamActions $actions): Response
    {
        $actions->revoke(OrganizationContext::from($request), $invitation);

        return response()->noContent();
    }

    public function accept(Request $request, TeamActions $actions): array
    {
        $data = $request->validate(['token' => ['required', 'string', 'size:64']]);
        $org = $actions->accept($request->user(), $data['token']);
        $request->session()->put('organization_id', $org->id);

        return ['data' => $org];
    }
}
