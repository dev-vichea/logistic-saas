<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class QuotationController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $query = $context->organization->quotations()
            ->with(['customer:id,name,code', 'originLocation:id,name,city,country_code', 'destinationLocation:id,name,city,country_code']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->query('customer_id'));
        }
        if ($request->filled('q')) {
            $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $request->query('q')).'%';
            $query->where(function (Builder $b) use ($pattern) {
                $b->orWhere('quotation_number', 'ilike', $pattern)
                  ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $pattern));
            });
        }

        return $query->orderBy('id', 'desc')->paginate($request->integer('per_page', 20))->withQueryString();
    }

    public function show(Request $request, int $organization, int $quotation): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $item = $context->organization->quotations()
            ->with([
                'lineItems',
                'customer', 'shipper', 'consignee',
                'originLocation', 'destinationLocation',
                'freightRequest',
                'bookings',
            ])
            ->findOrFail($quotation);

        return ['data' => $item];
    }

    public function store(QuotationFormRequest $request, FreightActions $actions): JsonResponse
    {
        $data = $request->validated();
        $lineItems = $data['line_items'] ?? [];
        unset($data['line_items']);

        $created = $actions->createQuotation(OrganizationContext::from($request), $data, $lineItems);

        return response()->json(['data' => $created], 201);
    }

    public function revise(QuotationFormRequest $request, int $organization, int $quotation, FreightActions $actions): JsonResponse
    {
        $data = $request->validated();
        $lineItems = $data['line_items'] ?? [];
        unset($data['line_items']);

        $revised = $actions->reviseQuotation(OrganizationContext::from($request), $quotation, $data, $lineItems);

        return response()->json(['data' => $revised], 201);
    }

    public function updateStatus(Request $request, int $organization, int $quotation, FreightActions $actions): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.manage');

        $validated = $request->validate([
            'status' => ['required', Rule::in(['draft', 'sent', 'accepted', 'rejected', 'expired'])],
        ]);

        $updated = $actions->updateQuotationStatus($context, $quotation, $validated['status']);

        return ['data' => $updated];
    }
}
