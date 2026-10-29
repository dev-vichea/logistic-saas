<?php

namespace App\Modules\Documents;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentReconciliationController extends Controller
{
    public function __construct(private DocumentActions $actions) {}

    public function index(Request $request, int $organization): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $query = $context->organization->documentReconciliations()
            ->with(['shipment', 'invoiceDocument', 'packingListDocument', 'reviewedByUser']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }

        $reconciliations = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 25));

        return response()->json($reconciliations);
    }

    public function store(ReconciliationRequest $request, int $organization): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $reconciliation = $this->actions->runReconciliation(
            $context,
            (int) $request->input('invoice_document_id'),
            (int) $request->input('packing_list_document_id'),
            $request->input('shipment_id') ? (int) $request->input('shipment_id') : null
        );

        return response()->json($reconciliation, 201);
    }

    public function show(Request $request, int $organization, int $reconciliation): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $record = $context->organization->documentReconciliations()
            ->with(['shipment', 'invoiceDocument.items', 'packingListDocument.items', 'reviewedByUser'])
            ->findOrFail($reconciliation);

        return response()->json($record);
    }

    public function resolve(Request $request, int $organization, int $reconciliation): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $record = $this->actions->resolveReconciliation($context, $reconciliation, $request->input('notes'));

        return response()->json($record);
    }
}
