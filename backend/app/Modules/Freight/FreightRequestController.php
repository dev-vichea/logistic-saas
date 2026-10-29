<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FreightRequestController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $query = $context->organization->freightRequests()
            ->with(['customer:id,name,code', 'originLocation:id,name,city,country_code', 'destinationLocation:id,name,city,country_code']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('transport_mode')) {
            $query->where('transport_mode', $request->query('transport_mode'));
        }
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->query('customer_id'));
        }
        if ($request->filled('q')) {
            $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $request->query('q')).'%';
            $query->where(function (Builder $b) use ($pattern) {
                $b->orWhere('request_number', 'ilike', $pattern)
                    ->orWhere('cargo_description', 'ilike', $pattern)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $pattern))
                    ->orWhereHas('originLocation', fn ($l) => $l->where('name', 'ilike', $pattern)->orWhere('city', 'ilike', $pattern))
                    ->orWhereHas('destinationLocation', fn ($l) => $l->where('name', 'ilike', $pattern)->orWhere('city', 'ilike', $pattern));
            });
        }

        return $query->orderBy('id', 'desc')->paginate($request->integer('per_page', 20))->withQueryString();
    }

    public function show(Request $request, int $organization, int $freightRequest): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $item = $context->organization->freightRequests()
            ->with([
                'customer', 'shipper', 'consignee',
                'originLocation', 'destinationLocation',
                'quotations' => fn ($q) => $q->orderBy('revision', 'desc'),
            ])
            ->findOrFail($freightRequest);

        return ['data' => $item];
    }

    public function store(FreightRequestFormRequest $request, FreightActions $actions): JsonResponse
    {
        $created = $actions->createFreightRequest(OrganizationContext::from($request), $request->validated());

        return response()->json(['data' => $created], 201);
    }

    public function update(FreightRequestFormRequest $request, int $organization, int $freightRequest, FreightActions $actions): array
    {
        $updated = $actions->updateFreightRequest(OrganizationContext::from($request), $freightRequest, $request->validated());

        return ['data' => $updated];
    }
}
