<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class DriverController
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
        $q = $this->organization->drivers()->with('carrierPartner:id,name,code');

        if ($search = $request->query('q')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('full_name', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%")
                    ->orWhere('license_number', 'ilike', "%{$search}%");
            });
        }

        if ($type = $request->query('license_type')) {
            $q->where('license_type', $type);
        }

        if ($status = $request->query('status')) {
            $q->where('current_status', $status);
        }

        $perPage = min((int) $request->query('per_page', 25), 100);

        return $q->orderBy('full_name')->paginate($perPage);
    }

    public function show(Request $request, int $organization, int $driver): JsonResponse
    {
        $item = $this->organization->drivers()
            ->with(['carrierPartner', 'trips' => fn ($q) => $q->latest()->limit(5)])
            ->findOrFail($driver);

        return response()->json(['data' => $item]);
    }

    public function store(DriverFormRequest $request): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $driver = $this->actions->createDriver($ctx, $request->validated());

        return response()->json(['data' => $driver->load('carrierPartner')], 201);
    }

    public function update(DriverFormRequest $request, int $organization, int $driver): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $updated = $this->actions->updateDriver($ctx, $driver, $request->validated());

        return response()->json(['data' => $updated->load('carrierPartner')]);
    }
}
