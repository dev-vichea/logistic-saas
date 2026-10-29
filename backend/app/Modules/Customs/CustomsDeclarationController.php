<?php

namespace App\Modules\Customs;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomsDeclarationController extends Controller
{
    public function __construct(private CustomsActions $actions) {}

    public function index(Request $request): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $context->authorize('customs.view');
        $org = $context->organization;

        $query = $org->customsDeclarations()
            ->with(['shipment', 'cdcMasterList', 'declarantPartner', 'consigneePartner'])
            ->withCount('items');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($office = $request->query('customs_office_code')) {
            $query->where('customs_office_code', $office);
        }
        if ($lane = $request->query('inspection_lane')) {
            $query->where('inspection_lane', $lane);
        }
        if ($regime = $request->query('regime_code')) {
            $query->where('regime_code', $regime);
        }
        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', (int) $shipmentId);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('declaration_number', 'ilike', "%{$search}%")
                    ->orWhere('invoice_number', 'ilike', "%{$search}%")
                    ->orWhere('bill_of_lading_number', 'ilike', "%{$search}%");
            });
        }

        $declarations = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 25));

        return response()->json($declarations);
    }

    public function store(CustomsDeclarationRequest $request): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $declaration = $this->actions->createDeclaration($context, $request->validated());

        return response()->json(['data' => $declaration], 201);
    }

    public function show(Request $request, int $organization, int $declaration): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('customs.view');
        $record = $context->organization->customsDeclarations()
            ->with([
                'items.cdcMasterItem',
                'deductions.cdcMasterItem',
                'shipment.legs',
                'cdcMasterList.items',
                'declarantPartner',
                'consigneePartner',
                'createdByUser',
            ])
            ->findOrFail($declaration);

        return ['data' => $record];
    }

    public function update(Request $request, int $organization, int $declaration): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $updated = $this->actions->updateDeclaration($context, $declaration, $request->all());

        return response()->json(['data' => $updated]);
    }

    public function transition(CustomsStatusTransitionRequest $request, int $organization, int $declaration): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $data = $request->validated();
        $updated = $this->actions->transitionDeclarationStatus(
            $context,
            $declaration,
            $data['status'],
            $data['inspection_lane'] ?? null,
            $data['notes'] ?? null
        );

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, int $organization, int $declaration): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $this->actions->deleteDeclaration($context, $declaration);

        return response()->json(['message' => 'Customs declaration deleted successfully.']);
    }
}
