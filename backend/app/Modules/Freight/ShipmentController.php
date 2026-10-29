<?php

namespace App\Modules\Freight;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $query = $context->organization->shipments()
            ->with([
                'customer:id,name,code',
                'carrier:id,name,code',
                'originLocation:id,name,city,country_code',
                'destinationLocation:id,name,city,country_code',
            ])
            ->withCount(['cargoItems', 'legs', 'milestones']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('customs_status')) {
            $query->where('customs_status', $request->query('customs_status'));
        }
        if ($request->filled('transport_mode')) {
            $query->where('transport_mode', $request->query('transport_mode'));
        }
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->query('customer_id'));
        }
        if ($request->filled('carrier_id')) {
            $query->where('carrier_id', $request->query('carrier_id'));
        }
        if ($request->filled('q')) {
            $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $request->query('q')).'%';
            $query->where(function (Builder $b) use ($pattern) {
                $b->orWhere('shipment_number', 'ilike', $pattern)
                    ->orWhere('master_tracking_number', 'ilike', $pattern)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $pattern))
                    ->orWhereHas('carrier', fn ($c) => $c->where('name', 'ilike', $pattern));
            });
        }

        return $query->orderBy('id', 'desc')->paginate($request->integer('per_page', 20))->withQueryString();
    }

    public function show(Request $request, int $organization, int $shipment): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.view');

        $item = $context->organization->shipments()
            ->with([
                'booking',
                'customer',
                'carrier',
                'originLocation',
                'destinationLocation',
                'cargoItems',
                'legs' => fn ($q) => $q->with(['carrier', 'originLocation', 'destinationLocation'])->orderBy('sequence'),
                'participants' => fn ($q) => $q->with(['partner', 'connectedOrganization']),
                'milestones' => fn ($q) => $q->with(['location', 'createdByUser'])->orderBy('occurred_at', 'desc'),
            ])
            ->findOrFail($shipment);

        return ['data' => $item];
    }

    public function store(ShipmentFormRequest $request, FreightActions $actions): JsonResponse
    {
        $data = $request->validated();
        $cargoItems = $data['cargo_items'] ?? [];
        $legs = $data['legs'] ?? [];
        $participants = $data['participants'] ?? [];
        unset($data['cargo_items'], $data['legs'], $data['participants']);

        $created = $actions->createShipment(
            OrganizationContext::from($request),
            $data,
            $cargoItems,
            $legs,
            $participants
        );

        return response()->json(['data' => $created], 201);
    }

    public function update(ShipmentFormRequest $request, int $organization, int $shipment, FreightActions $actions): array
    {
        $updated = $actions->updateShipment(OrganizationContext::from($request), $shipment, $request->validated());

        return ['data' => $updated];
    }

    public function addMilestone(MilestoneFormRequest $request, int $organization, int $shipment, FreightActions $actions): JsonResponse
    {
        $milestone = $actions->addMilestone(OrganizationContext::from($request), $shipment, $request->validated());

        return response()->json(['data' => $milestone], 201);
    }

    public function storeLeg(LegFormRequest $request, int $organization, int $shipment, FreightActions $actions): JsonResponse
    {
        $leg = $actions->saveLeg(OrganizationContext::from($request), $shipment, null, $request->validated());

        return response()->json(['data' => $leg], 201);
    }

    public function updateLeg(LegFormRequest $request, int $organization, int $shipment, int $leg, FreightActions $actions): array
    {
        $updated = $actions->saveLeg(OrganizationContext::from($request), $shipment, $leg, $request->validated());

        return ['data' => $updated];
    }

    public function storeCargoItem(CargoItemFormRequest $request, int $organization, int $shipment, FreightActions $actions): JsonResponse
    {
        $item = $actions->saveCargoItem(OrganizationContext::from($request), $shipment, null, null, $request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function updateCargoItem(CargoItemFormRequest $request, int $organization, int $shipment, int $item, FreightActions $actions): array
    {
        $updated = $actions->saveCargoItem(OrganizationContext::from($request), $shipment, null, $item, $request->validated());

        return ['data' => $updated];
    }

    public function destroyCargoItem(Request $request, int $organization, int $shipment, int $item, FreightActions $actions): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $context->authorize('freight.manage');

        $actions->deleteCargoItem($context, $item);

        return response()->json(['data' => ['success' => true]]);
    }
}
