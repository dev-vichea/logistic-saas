<?php

namespace App\Modules\Transportation;

use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProofOfDeliveryController
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

    public function store(ProofOfDeliveryFormRequest $request, int $organization, int $trip): JsonResponse
    {
        $ctx = OrganizationContext::from($request);
        $pod = $this->actions->recordProofOfDelivery($ctx, $trip, $request->validated());

        return response()->json(['data' => $pod->load(['shipment', 'dispatchTrip'])], 201);
    }

    public function show(Request $request, int $organization, int $pod): JsonResponse
    {
        $item = $this->organization->proofOfDeliveries()
            ->with(['shipment', 'dispatchTrip.vehicle', 'dispatchTrip.driver'])
            ->findOrFail($pod);

        return response()->json(['data' => $item]);
    }
}
