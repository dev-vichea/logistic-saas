<?php

namespace App\Modules\RecordDocuments;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RecordDocumentController
{
    public function __construct(private RecordDocumentActions $actions) {}

    public function listForRequest(Request $request, int $organization, int $materialRequest): array
    {
        return $this->listing($request, 'material_request', $materialRequest);
    }

    public function listForOrder(Request $request, int $organization, int $purchaseOrder): array
    {
        return $this->listing($request, 'purchase_order', $purchaseOrder);
    }

    public function uploadForRequest(RecordDocumentUploadRequest $request, int $organization, int $materialRequest): JsonResponse
    {
        return response()->json(['data' => $this->actions->upload(OrganizationContext::from($request), 'material_request', $materialRequest, $request->file('file'))], 201);
    }

    public function uploadForOrder(RecordDocumentUploadRequest $request, int $organization, int $purchaseOrder): JsonResponse
    {
        return response()->json(['data' => $this->actions->upload(OrganizationContext::from($request), 'purchase_order', $purchaseOrder, $request->file('file'))], 201);
    }

    public function contentForRequest(Request $request, int $organization, int $materialRequest, int $document): BinaryFileResponse
    {
        return $this->content($request, 'material_request', $materialRequest, $document);
    }

    public function contentForOrder(Request $request, int $organization, int $purchaseOrder, int $document): BinaryFileResponse
    {
        return $this->content($request, 'purchase_order', $purchaseOrder, $document);
    }

    public function deleteForRequest(Request $request, int $organization, int $materialRequest, int $document): JsonResponse
    {
        $this->actions->delete(OrganizationContext::from($request), 'material_request', $materialRequest, $document);

        return response()->json(['message' => 'Document removed.']);
    }

    public function deleteForOrder(Request $request, int $organization, int $purchaseOrder, int $document): JsonResponse
    {
        $this->actions->delete(OrganizationContext::from($request), 'purchase_order', $purchaseOrder, $document);

        return response()->json(['message' => 'Document removed.']);
    }

    private function listing(Request $request, string $kind, int $recordId): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize($kind === 'material_request' ? 'material_requests.view' : 'purchase_orders.view');
        $record = $this->actions->record($context->organization, $kind, $recordId);

        return ['data' => $record->documents()->with('uploadedBy:id,name')->orderByDesc('id')->get()];
    }

    private function content(Request $request, string $kind, int $recordId, int $documentId): BinaryFileResponse
    {
        $context = OrganizationContext::from($request);
        $context->authorize($kind === 'material_request' ? 'material_requests.view' : 'purchase_orders.view');
        $document = $this->actions->record($context->organization, $kind, $recordId)->documents()->findOrFail($documentId);
        $path = Storage::disk('local')->path($document->file_path);
        abort_unless(is_file($path), 404);

        if ($request->boolean('download')) {
            return response()->download($path, $document->file_name, ['X-Content-Type-Options' => 'nosniff']);
        }

        return response()->file($path, ['Content-Type' => $document->mime_type, 'Content-Disposition' => 'inline', 'X-Content-Type-Options' => 'nosniff']);
    }
}
