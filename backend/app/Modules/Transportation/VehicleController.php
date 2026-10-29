<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class VehicleController
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
        $q = $this->organization->vehicles()->with('carrierPartner:id,name,code');

        if ($search = $request->query('q')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('plate_number', 'ilike', "%{$search}%")
                    ->orWhere('make_model', 'ilike', "%{$search}%");
            });
        }

        if ($type = $request->query('type')) {
            $q->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $q->where('current_status', $status);
        }

        $perPage = min((int) $request->query('per_page', 25), 100);

        return $q->orderBy('plate_number')->paginate($perPage);
    }

    public function show(Request $request, int $organization, int $vehicle): JsonResponse
    {
        $item = $this->organization->vehicles()
            ->with(['carrierPartner', 'trips' => fn ($q) => $q->latest()->limit(5)])
            ->findOrFail($vehicle);

        return response()->json(['data' => $item]);
    }

    public function store(VehicleFormRequest $request): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $vehicle = $this->actions->createVehicle($ctx, $request->validated());

        return response()->json(['data' => $vehicle->load('carrierPartner')], 201);
    }

    public function update(VehicleFormRequest $request, int $organization, int $vehicle): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $updated = $this->actions->updateVehicle($ctx, $vehicle, $request->validated());

        return response()->json(['data' => $updated->load('carrierPartner')]);
    }
}
