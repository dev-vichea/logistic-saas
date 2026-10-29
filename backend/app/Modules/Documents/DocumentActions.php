<?php

namespace App\Modules\Documents;

use App\Modules\Audit\Audit;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

final class DocumentActions
{
    public function __construct(
        private OrganizationActions $organizations,
        private DocumentIntelligenceService $intelligence,
    ) {}

    /**
     * Upload & parse a new trade document.
     */
    public function uploadDocument(OrganizationContext $context, array $data, ?UploadedFile $file = null): TradeDocument
    {
        return $this->organizations->mutate($context, 'documents.upload', function (Organization $organization) use ($data, $file, $context) {
            $shipmentId = $data['shipment_id'] ?? null;
            if ($shipmentId !== null) {
                $this->validateShipment($organization, (int) $shipmentId);
            }

            $fileName = $data['file_name'] ?? ($file ? $file->getClientOriginalName() : 'document.csv');
            $fileSize = $data['file_size_bytes'] ?? ($file ? $file->getSize() : 0);
            $mimeType = $data['mime_type'] ?? ($file ? $file->getClientMimeType() : 'application/octet-stream');
            $filePath = null;

            $rawContent = $data['raw_content'] ?? null;
            if ($file) {
                $filePath = $file->store("organizations/{$organization->id}/documents", 'local');
                if (empty($rawContent) && in_array(strtolower($file->getClientOriginalExtension()), ['csv', 'txt', 'json'])) {
                    $rawContent = file_get_contents($file->getRealPath());
                }
            }

            $documentType = $data['document_type'] ?? 'commercial_invoice';
            $structuredInput = $data['structured_input'] ?? [];

            // AI Intelligence Parsing
            $parsed = $this->intelligence->parseDocument($fileName, $documentType, $rawContent, $structuredInput);

            $docNumber = $data['document_number'] ?? ($parsed['metadata']['invoice_no'] ?? null);

            $document = $organization->tradeDocuments()->create([
                'shipment_id' => $shipmentId,
                'document_number' => $docNumber,
                'document_type' => $documentType,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'file_size_bytes' => $fileSize,
                'mime_type' => $mimeType,
                'language' => $data['language'] ?? 'zh-CN,en',
                'status' => 'parsed',
                'confidence_score' => $parsed['confidence_score'] ?? 90.0,
                'extracted_metadata' => $parsed['metadata'] ?? [],
                'raw_content' => $rawContent,
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $context->membership->user_id,
            ]);

            // Insert extracted line items
            if (! empty($parsed['items'])) {
                foreach ($parsed['items'] as $itemData) {
                    $document->items()->create(array_merge($itemData, [
                        'organization_id' => $organization->id,
                    ]));
                }
            }

            Audit::record($organization, 'document.uploaded', [
                'document_id' => $document->id,
                'document_type' => $document->document_type,
                'document_number' => $document->document_number,
                'items_extracted' => count($parsed['items'] ?? []),
            ]);

            return $document->load('items');
        });
    }

    /**
     * Update document metadata or notes.
     */
    public function updateDocument(OrganizationContext $context, int $id, array $data): TradeDocument
    {
        return $this->organizations->mutate($context, 'documents.upload', function (Organization $organization) use ($id, $data) {
            $document = $organization->tradeDocuments()->findOrFail($id);

            if (array_key_exists('shipment_id', $data) && $data['shipment_id'] !== null) {
                $this->validateShipment($organization, (int) $data['shipment_id']);
            }

            $document->update($data);

            Audit::record($organization, 'document.updated', [
                'document_id' => $document->id,
                'fields' => array_keys($data),
            ]);

            return $document;
        });
    }

    /**
     * Mark document as verified by staff.
     */
    public function verifyDocument(OrganizationContext $context, int $id, array $data = []): TradeDocument
    {
        return $this->organizations->mutate($context, 'documents.verify', function (Organization $organization) use ($id, $data, $context) {
            $document = $organization->tradeDocuments()->findOrFail($id);

            $document->update([
                'status' => 'verified',
                'verified_by_user_id' => $context->membership->user_id,
                'verified_at' => now(),
                'notes' => $data['notes'] ?? $document->notes,
            ]);

            // Mark all items as confirmed
            $document->items()->update(['match_status' => 'confirmed']);

            Audit::record($organization, 'document.verified', [
                'document_id' => $document->id,
                'verified_by' => $context->membership->user_id,
            ]);

            return $document->load('items');
        });
    }

    /**
     * Delete document.
     */
    public function deleteDocument(OrganizationContext $context, int $id): void
    {
        $this->organizations->mutate($context, 'documents.delete', function (Organization $organization) use ($id) {
            $document = $organization->tradeDocuments()->findOrFail($id);

            if ($document->file_path && Storage::disk('local')->exists($document->file_path)) {
                Storage::disk('local')->delete($document->file_path);
            }

            $document->delete();

            Audit::record($organization, 'document.deleted', [
                'document_id' => $id,
            ]);
        });
    }

    /**
     * Update an individual extracted line item.
     */
    public function updateDocumentItem(OrganizationContext $context, int $documentId, int $itemId, array $data): TradeDocumentItem
    {
        return $this->organizations->mutate($context, 'documents.upload', function (Organization $organization) use ($documentId, $itemId, $data) {
            $document = $organization->tradeDocuments()->findOrFail($documentId);
            $item = $document->items()->findOrFail($itemId);

            if (isset($data['quantity']) && isset($data['unit_price']) && ! isset($data['total_amount'])) {
                $data['total_amount'] = round((float) $data['quantity'] * (float) $data['unit_price'], 2);
            }

            $item->update($data);

            Audit::record($organization, 'document_item.updated', [
                'document_id' => $documentId,
                'item_id' => $itemId,
                'fields' => array_keys($data),
            ]);

            return $item;
        });
    }

    /**
     * Run cross-reconciliation between Commercial Invoice and Packing List.
     */
    public function runReconciliation(OrganizationContext $context, int $invoiceDocId, int $packingDocId, ?int $shipmentId = null): DocumentReconciliation
    {
        return $this->organizations->mutate($context, 'documents.verify', function (Organization $organization) use ($invoiceDocId, $packingDocId, $shipmentId, $context) {
            $invoice = $organization->tradeDocuments()->findOrFail($invoiceDocId);
            $packing = $organization->tradeDocuments()->findOrFail($packingDocId);

            if ($shipmentId !== null) {
                $this->validateShipment($organization, $shipmentId);
            } else {
                $shipmentId = $invoice->shipment_id ?: $packing->shipment_id;
            }

            $result = $this->intelligence->reconcile($invoice, $packing);

            $reconciliation = $organization->documentReconciliations()->create([
                'shipment_id' => $shipmentId,
                'invoice_document_id' => $invoice->id,
                'packing_list_document_id' => $packing->id,
                'status' => $result['status'],
                'total_invoice_items' => $result['total_invoice_items'],
                'total_packing_items' => $result['total_packing_items'],
                'matched_items_count' => $result['matched_items_count'],
                'discrepancy_count' => $result['discrepancy_count'],
                'invoice_total_quantity' => $result['invoice_total_quantity'],
                'packing_total_quantity' => $result['packing_total_quantity'],
                'invoice_total_gross_weight' => $result['invoice_total_gross_weight'],
                'packing_total_gross_weight' => $result['packing_total_gross_weight'],
                'discrepancies' => $result['discrepancies'],
                'pairs' => $result['pairs'],
                'reviewed_by_user_id' => $context->membership->user_id,
                'reviewed_at' => now(),
            ]);

            // Update item match statuses
            foreach ($result['pairs'] as $pair) {
                if (! empty($pair['invoice_item']['id'])) {
                    $invoice->items()->where('id', $pair['invoice_item']['id'])->update([
                        'match_status' => $pair['status'],
                        'discrepancy_details' => ! empty($pair['issues']) ? $pair['issues'] : null,
                    ]);
                }
                if (! empty($pair['packing_item']['id'])) {
                    $packing->items()->where('id', $pair['packing_item']['id'])->update([
                        'match_status' => $pair['status'],
                        'discrepancy_details' => ! empty($pair['issues']) ? $pair['issues'] : null,
                    ]);
                }
            }

            // Update document statuses
            $docStatus = $result['status'] === 'balanced' ? 'reconciled' : 'flagged';
            $invoice->update(['status' => $docStatus]);
            $packing->update(['status' => $docStatus]);

            Audit::record($organization, 'document.reconciled', [
                'reconciliation_id' => $reconciliation->id,
                'status' => $result['status'],
                'discrepancy_count' => $result['discrepancy_count'],
            ]);

            return $reconciliation->load(['invoiceDocument', 'packingListDocument']);
        });
    }

    /**
     * Resolve reconciliation manually.
     */
    public function resolveReconciliation(OrganizationContext $context, int $id, ?string $notes = null): DocumentReconciliation
    {
        return $this->organizations->mutate($context, 'documents.verify', function (Organization $organization) use ($id, $notes, $context) {
            $reconciliation = $organization->documentReconciliations()->findOrFail($id);

            $reconciliation->update([
                'status' => 'resolved',
                'notes' => $notes ?: $reconciliation->notes,
                'reviewed_by_user_id' => $context->membership->user_id,
                'reviewed_at' => now(),
            ]);

            Audit::record($organization, 'document_reconciliation.resolved', [
                'reconciliation_id' => $reconciliation->id,
            ]);

            return $reconciliation;
        });
    }

    /**
     * 1-Click Sync: Push extracted document items into shipment cargo manifest.
     */
    public function pushToShipmentCargo(OrganizationContext $context, int $documentId, int $shipmentId, array $itemIds = []): array
    {
        return $this->organizations->mutate($context, 'documents.verify', function (Organization $organization) use ($documentId, $shipmentId, $itemIds) {
            $document = $organization->tradeDocuments()->findOrFail($documentId);
            $shipment = $organization->shipments()->findOrFail($shipmentId);

            $query = $document->items();
            if (! empty($itemIds)) {
                $query->whereIn('id', $itemIds);
            }
            $items = $query->get();

            if ($items->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => 'No line items available to push to shipment cargo.',
                ]);
            }

            $createdCargoItems = [];
            foreach ($items as $item) {
                $cargo = $shipment->cargoItems()->create([
                    'organization_id' => $organization->id,
                    'booking_id' => $shipment->booking_id,
                    'description' => $item->description_english ?: ($item->description_original ?: "Item #{$item->line_number}"),
                    'commodity' => $item->description_original,
                    'hs_code' => $item->hs_code,
                    'package_type' => $item->package_type ?: 'cartons',
                    'quantity' => (int) max(1, round((float) $item->quantity)),
                    'gross_weight_kg' => (float) ($item->gross_weight_kg ?? 0),
                    'net_weight_kg' => (float) ($item->net_weight_kg ?? 0),
                    'volume_cbm' => (float) ($item->volume_cbm ?? 0),
                ]);

                $createdCargoItems[] = $cargo;
            }

            // Link document to shipment if not already linked
            if (! $document->shipment_id) {
                $document->update(['shipment_id' => $shipment->id]);
            }

            Audit::record($organization, 'cargo.synced_from_document', [
                'document_id' => $document->id,
                'shipment_id' => $shipment->id,
                'cargo_items_created' => count($createdCargoItems),
            ]);

            return [
                'document_id' => $document->id,
                'shipment_id' => $shipment->id,
                'created_count' => count($createdCargoItems),
                'cargo_items' => $createdCargoItems,
            ];
        });
    }

    private function validateShipment(Organization $organization, int $shipmentId): void
    {
        if (! $organization->shipments()->where('id', $shipmentId)->exists()) {
            throw ValidationException::withMessages([
                'shipment_id' => 'The selected shipment does not belong to this organization.',
            ]);
        }
    }
}
