<?php

namespace App\Modules\Locations;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LocationController
{
    public function index(Request $request, int $organization, int $partner): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('partners.view');
        $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:1000000']]);

        return $context->organization->partners()->findOrFail($partner)->locations()->orderByDesc('is_primary')->orderBy('id')->paginate(25);
    }

    public function show(Request $request, int $organization, int $partner, int $location): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('partners.view');

        return ['data' => $context->organization->partners()->findOrFail($partner)->locations()->findOrFail($location)];
    }

    public function store(LocationRequest $request, int $organization, int $partner, LocationActions $actions): JsonResponse
    {
        return response()->json(['data' => $actions->save(OrganizationContext::from($request), $partner, null, $request->validated())], 201);
    }

    public function update(LocationRequest $request, int $organization, int $partner, int $location, LocationActions $actions): array
    {
        return ['data' => $actions->save(OrganizationContext::from($request), $partner, $location, $request->validated())];
    }

    public function destroy(Request $request, int $organization, int $partner, int $location, LocationActions $actions): Response
    {
        $actions->delete(OrganizationContext::from($request), $partner, $location);

        return response()->noContent();
    }
}
