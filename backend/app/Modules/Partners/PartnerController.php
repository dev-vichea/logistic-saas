<?php

namespace App\Modules\Partners;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PartnerController
{
    public function catalog(Request $request): array
    {
        OrganizationContext::from($request)->authorize('partners.view');

        return ['data' => ['roles' => config('partners.roles'), 'location_types' => config('partners.location_types'), 'countries' => config('partner_countries')]];
    }

    public function index(PartnerListRequest $request): LengthAwarePaginator
    {
        $filters = $request->validated();
        $query = OrganizationContext::from($request)->organization->partners()->withCount(['contacts', 'locations']);
        $status = $filters['status'] ?? 'active';
        if ($status === 'active') {
            $query->whereNull('archived_at');
        }
        if ($status === 'archived') {
            $query->whereNotNull('archived_at');
        }
        if (! empty($filters['role'])) {
            $query->whereJsonContains('roles', $filters['role']);
        }
        if (! empty($filters['country_code'])) {
            $query->where('country_code', $filters['country_code']);
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $filters['q']).'%';
            $query->where(function (Builder $search) use ($pattern) {
                foreach (['name', 'legal_name', 'code', 'email', 'phone', 'tax_number', 'registration_number'] as $field) {
                    $search->orWhere($field, 'ilike', $pattern);
                }
                $search->orWhereHas('contacts', fn (Builder $contacts) => $contacts->where(fn (Builder $fields) => $fields->where('name', 'ilike', $pattern)->orWhere('email', 'ilike', $pattern)->orWhere('phone', 'ilike', $pattern)));
                $search->orWhereHas('locations', fn (Builder $locations) => $locations->where(fn (Builder $fields) => $fields->where('name', 'ilike', $pattern)->orWhere('address_line_1', 'ilike', $pattern)->orWhere('city', 'ilike', $pattern)));
            });
        }
        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';
        if ($sort === 'name') {
            $query->orderByRaw('lower(name) '.$direction);
        } else {
            $query->orderByRaw($sort.' '.$direction.' NULLS LAST');
        }

        return $query->orderBy('id', $direction)->paginate($filters['per_page'] ?? 20)->withQueryString();
    }

    public function show(Request $request, int $organization, int $partner): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('partners.view');

        return ['data' => $context->organization->partners()->withCount(['contacts', 'locations'])->findOrFail($partner)];
    }

    public function store(PartnerRequest $request, PartnerActions $actions): JsonResponse
    {
        return response()->json(['data' => $actions->create(OrganizationContext::from($request), $request->validated())], 201);
    }

    public function update(PartnerRequest $request, int $organization, int $partner, PartnerActions $actions): array
    {
        return ['data' => $actions->update(OrganizationContext::from($request), $partner, $request->validated())];
    }

    public function archive(Request $request, int $organization, int $partner, PartnerActions $actions): array
    {
        return ['data' => $actions->archive(OrganizationContext::from($request), $partner, true)];
    }

    public function restore(Request $request, int $organization, int $partner, PartnerActions $actions): array
    {
        return ['data' => $actions->archive(OrganizationContext::from($request), $partner, false)];
    }
}
