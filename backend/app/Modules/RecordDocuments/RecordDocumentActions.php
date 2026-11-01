<?php

namespace App\Modules\RecordDocuments;

use App\Modules\Audit\Audit;
use App\Modules\MaterialRequests\MaterialRequest;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use App\Modules\PurchaseOrders\PurchaseOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

final class RecordDocumentActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function upload(OrganizationContext $context, string $kind, int $recordId, UploadedFile $file): RecordDocument
    {
        $path = null;
        try {
            return $this->organizations->mutate($context, $this->permission($kind), function (Organization $organization) use ($context, $kind, $recordId, $file, &$path) {
                $record = $this->record($organization, $kind, $recordId);
                $path = $file->store("organizations/{$organization->id}/record-documents", 'local');
                $document = $record->documents()->create([
                    'organization_id' => $organization->id,
                    'uploaded_by_user_id' => $context->membership->user_id,
                    'file_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'file_size_bytes' => $file->getSize(),
                ]);
                Audit::record($organization, 'record_document.uploaded', [$this->metadataKey($kind) => $recordId, 'record_document_id' => $document->id]);

                return $document->load('uploadedBy:id,name');
            });
        } catch (\Throwable $error) {
            if ($path !== null) {
                Storage::disk('local')->delete($path);
            }
            throw $error;
        }
    }

    public function delete(OrganizationContext $context, string $kind, int $recordId, int $documentId): void
    {
        $path = $this->organizations->mutate($context, $this->permission($kind), function (Organization $organization) use ($kind, $recordId, $documentId) {
            $document = $this->record($organization, $kind, $recordId)->documents()->findOrFail($documentId);
            $path = $document->file_path;
            $document->delete();
            Audit::record($organization, 'record_document.deleted', [$this->metadataKey($kind) => $recordId, 'record_document_id' => $documentId]);

            return $path;
        });
        Storage::disk('local')->delete($path);
    }

    public function record(Organization $organization, string $kind, int $id): MaterialRequest|PurchaseOrder
    {
        return $kind === 'material_request'
            ? $organization->materialRequests()->findOrFail($id)
            : $organization->purchaseOrders()->findOrFail($id);
    }

    public function permission(string $kind): string
    {
        return $kind === 'material_request' ? 'material_requests.manage' : 'purchase_orders.manage';
    }

    private function metadataKey(string $kind): string
    {
        return $kind === 'material_request' ? 'material_request_id' : 'purchase_order_id';
    }
}
