<?php

namespace App\Modules\Documents;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TradeDocumentController extends Controller
{
    public function __construct(private DocumentActions $actions) {}

    public function index(Request $request, int $organization): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $query = $context->organization->tradeDocuments()->with(['shipment', 'createdByUser'])->withCount('items');

        if ($type = $request->query('document_type')) {
            $query->where('document_type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('document_number', 'ilike', "%{$search}%")
                    ->orWhere('file_name', 'ilike', "%{$search}%");
            });
        }

        $documents = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 25));

        return response()->json($documents);
    }

    public function store(DocumentUploadRequest $request, int $organization): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $file = $request->file('file');

        $document = $this->actions->uploadDocument($context, $request->validated(), $file);

        return response()->json($document, 201);
    }

    public function show(Request $request, int $organization, int $document): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $doc = $context->organization->tradeDocuments()
            ->with(['shipment', 'createdByUser', 'verifiedByUser', 'items'])
            ->findOrFail($document);

        return response()->json($doc);
    }

    public function update(DocumentUpdateRequest $request, int $organization, int $document): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $doc = $this->actions->updateDocument($context, $document, $request->validated());

        return response()->json($doc);
    }

    public function destroy(Request $request, int $organization, int $document): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $this->actions->deleteDocument($context, $document);

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function verify(Request $request, int $organization, int $document): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $doc = $this->actions->verifyDocument($context, $document, $request->all());

        return response()->json($doc);
    }

    public function pushToCargo(PushToCargoRequest $request, int $organization, int $document): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $shipmentId = (int) $request->input('shipment_id');
        $itemIds = (array) $request->input('item_ids', []);

        $result = $this->actions->pushToShipmentCargo($context, $document, $shipmentId, $itemIds);

        return response()->json($result);
    }
}
