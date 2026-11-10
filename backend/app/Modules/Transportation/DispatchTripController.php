<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\OrganizationContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

class DispatchTripController
{
    public function __construct(private TransportationActions $actions) {}

    public function index(Request $request): LengthAwarePaginator
    {
        $context = $this->context($request);
        $filters = $request->validate([
            'stage' => ['sometimes', 'in:active'],
            'schedule' => ['sometimes', 'in:scheduled,unscheduled'],
            'from' => ['sometimes', 'date_format:Y-m-d', 'prohibited_unless:schedule,scheduled'],
            'through' => ['sometimes', 'date_format:Y-m-d', 'prohibited_unless:schedule,scheduled', Rule::when($request->has('from'), 'after_or_equal:from')],
            'include' => ['sometimes', 'in:legs'],
        ]);

        $q = $context->organization->dispatchTrips()->with([
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
        if (isset($filters['stage'])) {
            $q->whereIn('status', ['dispatched', 'loading', 'in_transit', 'unloading']);
        }

        $schedule = $filters['schedule'] ?? null;
        if ($schedule === 'scheduled') {
            $q->whereNotNull('scheduled_start_time')->orderBy('scheduled_start_time');
            $timezone = $context->organization->timezone;
            if (isset($filters['from'])) {
                $from = CarbonImmutable::parse($filters['from'], $timezone)->startOfDay()->utc();
                $q->where('scheduled_start_time', '>=', $from);
            }
            if (isset($filters['through'])) {
                $until = CarbonImmutable::parse($filters['through'], $timezone)->startOfDay()->addDay()->utc();
                $q->where('scheduled_start_time', '<', $until);
            }
        } elseif ($schedule === 'unscheduled') {
            $q->whereNull('scheduled_start_time');
        }

        if (isset($filters['include'])) {
            $context->authorize('freight.view');
            $q->has('tripLegs')->with([
                'carrierPartner:id,name',
                'tripLegs:id,dispatch_trip_id,shipment_leg_id,sequence',
                'tripLegs.shipmentLeg:id,shipment_id,origin_location_id,destination_location_id,leg_type,status',
                'tripLegs.shipmentLeg.shipment:id,shipment_number',
                'tripLegs.shipmentLeg.originLocation:id,name,city',
                'tripLegs.shipmentLeg.destinationLocation:id,name,city',
            ]);
        }

        $perPage = min((int) $request->query('per_page', 25), 100);

        return $q->orderBy('id', $schedule === 'scheduled' ? 'asc' : 'desc')->paginate($perPage);
    }

    public function schedule(Request $request): JsonResponse
    {
        $organization = $this->context($request)->organization;
        $filters = $request->validate([
            'week' => ['required', 'date_format:Y-m-d'],
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', 'in:draft,dispatched,loading,in_transit,unloading,completed,cancelled'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'unassigned_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $week = CarbonImmutable::parse($filters['week'], $organization->timezone)->startOfDay();
        $from = $week->utc();
        $until = $week->addWeek()->utc();
        $status = $filters['status'] ?? null;
        $search = trim($filters['q'] ?? '');
        $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';

        $inWeek = function (Builder|Relation $trips) use ($from, $until): void {
            $trips->where('scheduled_start_time', '<', $until)
                ->where(fn (Builder $overlap) => $overlap
                    ->where('scheduled_start_time', '>=', $from)
                    ->orWhere('scheduled_end_time', '>', $from));
        };
        $matching = function (Builder|Relation $trips) use ($inWeek, $status, $search, $pattern): void {
            $inWeek($trips);
            if ($status) {
                $trips->where('status', $status);
            }
            if ($search !== '') {
                $trips->where(fn (Builder $match) => $match
                    ->where('trip_number', 'ilike', $pattern)
                    ->orWhereHas('driver', fn (Builder $driver) => $driver->where('full_name', 'ilike', $pattern))
                    ->orWhereHas('vehicle', fn (Builder $vehicle) => $vehicle
                        ->where('plate_number', 'ilike', $pattern)->orWhere('make_model', 'ilike', $pattern))
                    ->orWhereHas('originLocation', fn (Builder $location) => $location->where('name', 'ilike', $pattern))
                    ->orWhereHas('destinationLocation', fn (Builder $location) => $location->where('name', 'ilike', $pattern)));
            }
        };
        $loadTrips = function (Builder|Relation $trips) use ($matching): void {
            $matching($trips);
            $trips->select(['id', 'trip_number', 'vehicle_id', 'driver_id', 'origin_location_id', 'destination_location_id', 'status', 'scheduled_start_time', 'scheduled_end_time'])
                ->with(['driver:id,full_name', 'originLocation:id,name', 'destinationLocation:id,name'])
                ->orderBy('scheduled_start_time')->orderBy('id');
        };

        $vehicles = $organization->vehicles()
            ->where(fn (Builder $fleet) => $fleet->where('is_active', true)->orWhereHas('trips', $inWeek));
        if ($status) {
            $vehicles->whereHas('trips', $matching);
        } elseif ($search !== '') {
            $vehicles->where(fn (Builder $fleet) => $fleet
                ->where('plate_number', 'ilike', $pattern)->orWhere('make_model', 'ilike', $pattern)
                ->orWhereHas('trips', $matching));
        }

        $unassigned = $organization->dispatchTrips()->whereNull('vehicle_id');
        $loadTrips($unassigned);
        $weekTrips = $organization->dispatchTrips();
        $matching($weekTrips);
        $hasTrips = $weekTrips->exists();
        $latest = ! $hasTrips && $search === '' && ! $status
            ? $organization->dispatchTrips()->whereNotNull('scheduled_start_time')
                ->latest('scheduled_start_time')->first(['scheduled_start_time'])
            : null;

        return response()->json([
            'vehicles' => $vehicles->with(['trips' => $loadTrips])->orderBy('plate_number')->orderBy('id')
                ->paginate(20, ['id', 'plate_number', 'make_model', 'current_status']),
            'unassigned' => $unassigned->paginate(20, ['*'], 'unassigned_page'),
            'has_trips' => $hasTrips,
            'latest_start' => $latest?->scheduled_start_time?->toISOString(),
        ]);
    }

    public function show(Request $request, int $organization, int $trip): JsonResponse
    {
        $context = $this->context($request);
        $options = $request->validate(['include' => ['sometimes', 'in:manifest']]);
        $relations = [
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
        ];
        if (isset($options['include'])) {
            $context->authorize('freight.view');
            $relations[] = 'tripLegs.shipmentLeg.shipment.cargoItems';
        }
        $item = $context->organization->dispatchTrips()->with($relations)->findOrFail($trip);

        return response()->json(['data' => $item]);
    }

    public function store(DispatchTripFormRequest $request): JsonResponse
    {
        $ctx = $this->context($request);
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
        $ctx = $this->context($request);
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
        $ctx = $this->context($request);
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
        $ctx = $this->context($request);
        $validated = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $cancelled = $this->actions->cancelTrip($ctx, $trip, $validated['reason'] ?? null);

        return response()->json(['data' => $cancelled]);
    }

    private function context(Request $request): OrganizationContext
    {
        $context = OrganizationContext::from($request);
        $context->authorize('transport.view');

        return $context;
    }
}
