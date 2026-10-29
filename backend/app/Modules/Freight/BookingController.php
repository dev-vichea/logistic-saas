<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $query = $context->organization->bookings()
            ->with(['customer:id,name,code', 'originLocation:id,name,city,country_code', 'destinationLocation:id,name,city,country_code'])
            ->withCount(['cargoItems', 'shipments']);

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
                $b->orWhere('booking_number', 'ilike', $pattern)
                    ->orWhere('customer_reference', 'ilike', $pattern)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $pattern));
            });
        }

        return $query->orderBy('id', 'desc')->paginate($request->integer('per_page', 20))->withQueryString();
    }

    public function show(Request $request, int $organization, int $booking): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $item = $context->organization->bookings()
            ->with([
                'quotation', 'customer', 'shipper', 'consignee',
                'originLocation', 'destinationLocation',
                'cargoItems', 'shipments',
            ])
            ->findOrFail($booking);

        return ['data' => $item];
    }

    public function store(BookingFormRequest $request, FreightActions $actions): JsonResponse
    {
        $data = $request->validated();
        $cargoItems = $data['cargo_items'] ?? [];
        unset($data['cargo_items']);

        $created = $actions->createBooking(OrganizationContext::from($request), $data, $cargoItems);

        return response()->json(['data' => $created], 201);
    }

    public function update(BookingFormRequest $request, int $organization, int $booking, FreightActions $actions): array
    {
        $updated = $actions->updateBooking(OrganizationContext::from($request), $booking, $request->validated());

        return ['data' => $updated];
    }
}
