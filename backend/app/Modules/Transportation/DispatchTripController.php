<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class DispatchTripController
{
    private Organization $organization;

    public function __construct(
        Request $request,
        private TransportationActions $actions
    ) {
        $ctx = OrganizationContext::from($request);
        $ctx->authorize('transport.view');
        $this->organization = $ctx->organization;
    }

    public function index(Request $request): LengthAwarePaginator
    {
        $q = $this->organization->dispatchTrips()->with([
            'vehicle:id,plate_number,type,make_model',
            'driver:id,full_name,phone',
            'originLocation:id,name,city,country_code',
            'destinationLocation:id,name,city,country_code',
        ])->withCount(['tripLegs', 'proofOfDeliveries']);

        if ($search = $request->query('q')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('trip_number', 'ilike', "%{$search}%")
                    ->orWhere('container_number', 'ilike', "%{$search}%")
                    ->orWhere('seal_number', 'ilike', "%{$search}%")
                    ->orWhereHas('driver', fn ($d) => $d->where('full_name', 'ilike', "%{$search}%"))
                    ->orWhereHas('vehicle', fn ($v) => $v->where('plate_number', 'ilike', "%{$search}%"));
            });
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        $perPage = min((int) $request->query('per_page', 25), 100);

        return $q->latest('id')->paginate($perPage);
    }

    public function show(Request $request, int $organization, int $trip): JsonResponse
    {
        $item = $this->organization->dispatchTrips()->with([
            'vehicle',
            'trailerVehicle',
            'driver',
            'secondaryDriver',
            'carrierPartner',
            'originLocation',
            'destinationLocation',
            'tripLegs.shipmentLeg.shipment.customer',
            'tripLegs.shipmentLeg.originLocation',
            'tripLegs.shipmentLeg.destinationLocation',
            'proofOfDeliveries.shipment',
        ])->findOrFail($trip);

        return response()->json(['data' => $item]);
    }

    public function store(DispatchTripFormRequest $request): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $trip = $this->actions->createTrip($ctx, $request->validated());

        return response()->json(['data' => $trip->load([
            'vehicle',
            'driver',
            'originLocation',
            'destinationLocation',
            'tripLegs.shipmentLeg',
        ])], 201);
    }

    public function update(DispatchTripFormRequest $request, int $organization, int $trip): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $updated = $this->actions->updateTrip($ctx, $trip, $request->validated());

        return response()->json(['data' => $updated->load([
            'vehicle',
            'driver',
            'originLocation',
            'destinationLocation',
            'tripLegs.shipmentLeg',
        ])]);
    }

    public function dispatch(Request $request, int $organization, int $trip): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $validated = $request->validate([
            'odometer_start_km' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'container_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'seal_number' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        $dispatched = $this->actions->dispatchTrip($ctx, $trip, $validated);

        return response()->json(['data' => $dispatched->load(['vehicle', 'driver', 'tripLegs.shipmentLeg'])]);
    }

    public function cancel(Request $request, int $organization, int $trip): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $validated = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $cancelled = $this->actions->cancelTrip($ctx, $trip, $validated['reason'] ?? null);

        return response()->json(['data' => $cancelled]);
    }
}
