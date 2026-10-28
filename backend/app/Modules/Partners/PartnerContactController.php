<?php

namespace App\Modules\Partners;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PartnerContactController
{
    public function index(Request $request, int $organization, int $partner): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('partners.view');
        $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:1000000']]);

        return $context->organization->partners()->findOrFail($partner)->contacts()->orderByDesc('is_primary')->orderBy('id')->paginate(25);
    }

    public function show(Request $request, int $organization, int $partner, int $contact): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('partners.view');

        return ['data' => $context->organization->partners()->findOrFail($partner)->contacts()->findOrFail($contact)];
    }

    public function store(PartnerContactRequest $request, int $organization, int $partner, PartnerActions $actions): JsonResponse
    {
        return response()->json(['data' => $actions->saveContact(OrganizationContext::from($request), $partner, null, $request->validated())], 201);
    }

    public function update(PartnerContactRequest $request, int $organization, int $partner, int $contact, PartnerActions $actions): array
    {
        return ['data' => $actions->saveContact(OrganizationContext::from($request), $partner, $contact, $request->validated())];
    }

    public function destroy(Request $request, int $organization, int $partner, int $contact, PartnerActions $actions): Response
    {
        $actions->deleteContact(OrganizationContext::from($request), $partner, $contact);

        return response()->noContent();
    }
}
