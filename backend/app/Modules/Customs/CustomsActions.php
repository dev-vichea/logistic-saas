<?php

namespace App\Modules\Customs;

use App\Modules\Audit\Audit;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Validation\ValidationException;

final class CustomsActions
{
    public function __construct(
        private OrganizationActions $organizations,
        private CustomsService $service,
    ) {}

    /**
     * Create a new CDC Master List.
     */
    public function createCdcMasterList(OrganizationContext $context, array $data): CdcMasterList
    {
        return $this->organizations->mutate($context, 'customs.manage', function (Organization $organization) use ($data, $context) {
            $list = $organization->cdcMasterLists()->create([
                'qip_number' => $data['qip_number'],
                'company_name' => $data['company_name'],
                'tin_number' => $data['tin_number'] ?? null,
                'approval_reference' => $data['approval_reference'],
                'effective_year' => $data['effective_year'] ?? (int) date('Y'),
                'valid_from' => $data['valid_from'] ?? null,
                'valid_until' => $data['valid_until'] ?? null,
                'status' => $data['status'] ?? 'active',
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $context->membership->user_id,
            ]);

            if (! empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $index => $itemData) {
                    $approvedQty = (float) $itemData['approved_quantity'];
                    $unitPrice = (float) ($itemData['unit_price_usd'] ?? 0);
                    $totalPrice = $itemData['total_price_usd'] ?? ($approvedQty * $unitPrice);

                    $list->items()->create([
                        'organization_id' => $organization->id,
                        'category' => $itemData['category'] ?? 'raw_materials',
                        'item_number' => $itemData['item_number'] ?? ($index + 1),
                        'description_original' => $itemData['description_original'] ?? null,
                        'description_english' => $itemData['description_english'],
                        'hs_code' => $itemData['hs_code'] ?? null,
                        'model_specification' => $itemData['model_specification'] ?? null,
                        'unit_of_measure' => $itemData['unit_of_measure'] ?? 'PCS',
                        'approved_quantity' => $approvedQty,
                        'consumed_quantity' => 0.000,
                        'remaining_quantity' => $approvedQty,
                        'unit_price_usd' => $unitPrice,
                        'total_price_usd' => $totalPrice,
                        'remarks' => $itemData['remarks'] ?? null,
                    ]);
                }
            }

            Audit::record($organization, 'cdc_master_list.created', [
                'cdc_master_list_id' => $list->id,
                'qip_number' => $list->qip_number,
                'approval_reference' => $list->approval_reference,
            ]);

            return $list->fresh(['items']);
        });
    }

    /**
     * Add an item to a CDC Master List.
     */
    public function addCdcMasterItem(OrganizationContext $context, int $masterListId, array $data): CdcMasterItem
    {
        return $this->organizations->mutate($context, 'customs.manage', function (Organization $organization) use ($masterListId, $data) {
            $list = $organization->cdcMasterLists()->findOrFail($masterListId);

            $approvedQty = (float) $data['approved_quantity'];
            $unitPrice = (float) ($data['unit_price_usd'] ?? 0);
            $totalPrice = $data['total_price_usd'] ?? ($approvedQty * $unitPrice);
            $nextNumber = ($list->items()->max('item_number') ?? 0) + 1;

            $item = $list->items()->create([
                'organization_id' => $organization->id,
                'category' => $data['category'] ?? 'raw_materials',
                'item_number' => $data['item_number'] ?? $nextNumber,
                'description_original' => $data['description_original'] ?? null,
                'description_english' => $data['description_english'],
                'hs_code' => $data['hs_code'] ?? null,
                'model_specification' => $data['model_specification'] ?? null,
                'unit_of_measure' => $data['unit_of_measure'] ?? 'PCS',
                'approved_quantity' => $approvedQty,
                'consumed_quantity' => 0.000,
                'remaining_quantity' => $approvedQty,
                'unit_price_usd' => $unitPrice,
                'total_price_usd' => $totalPrice,
                'remarks' => $data['remarks'] ?? null,
            ]);

            Audit::record($organization, 'cdc_master_item.created', [
                'cdc_master_item_id' => $item->id,
                'master_list_id' => $list->id,
                'item_number' => $item->item_number,
                'hs_code' => $item->hs_code,
            ]);

            return $item;
        });
    }

    /**
     * Create a new ASYCUDA Customs Declaration.
     */
    public function createDeclaration(OrganizationContext $context, array $data): CustomsDeclaration
    {
        return $this->organizations->mutate($context, 'customs.declare', function (Organization $organization) use ($data, $context) {
            $shipmentId = $data['shipment_id'] ?? null;
            if ($shipmentId !== null) {
                $this->validateShipment($organization, (int) $shipmentId);
            }

            $cdcListId = $data['cdc_master_list_id'] ?? null;
            if ($cdcListId !== null) {
                $organization->cdcMasterLists()->findOrFail((int) $cdcListId);
            }

            if (! empty($data['declarant_partner_id'])) {
                $organization->partners()->findOrFail((int) $data['declarant_partner_id']);
            }
            if (! empty($data['consignee_partner_id'])) {
                $organization->partners()->findOrFail((int) $data['consignee_partner_id']);
            }

            $declaration = $organization->customsDeclarations()->create([
                'shipment_id' => $shipmentId,
                'cdc_master_list_id' => $cdcListId,
                'declaration_number' => $data['declaration_number'],
                'declaration_date' => $data['declaration_date'] ?? date('Y-m-d'),
                'declaration_type' => $data['declaration_type'] ?? 'import',
                'customs_office_code' => $data['customs_office_code'] ?? 'KHKAS',
                'regime_code' => $data['regime_code'] ?? 'IM 4',
                'status' => $data['status'] ?? 'draft',
                'inspection_lane' => $data['inspection_lane'] ?? 'green',
                'declarant_partner_id' => $data['declarant_partner_id'] ?? null,
                'consignee_partner_id' => $data['consignee_partner_id'] ?? null,
                'invoice_number' => $data['invoice_number'] ?? null,
                'bill_of_lading_number' => $data['bill_of_lading_number'] ?? null,
                'total_packages' => $data['total_packages'] ?? 0,
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $context->membership->user_id,
            ]);

            if (! empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $index => $itemData) {
                    $qty = (float) $itemData['quantity'];
                    $customsVal = (float) ($itemData['customs_value_usd'] ?? 0);
                    $dutyRate = (float) ($itemData['duty_rate_percent'] ?? 7.0);
                    $isExempt = (bool) ($itemData['is_duty_exempt'] ?? true);
                    $exemptAmount = $isExempt ? round($customsVal * ($dutyRate / 100), 2) : 0.00;

                    $declaration->items()->create([
                        'organization_id' => $organization->id,
                        'cdc_master_item_id' => $itemData['cdc_master_item_id'] ?? null,
                        'item_number' => $itemData['item_number'] ?? ($index + 1),
                        'hs_code' => $itemData['hs_code'],
                        'description' => $itemData['description'],
                        'quantity' => $qty,
                        'unit_of_measure' => $itemData['unit_of_measure'] ?? 'PCS',
                        'gross_weight_kg' => $itemData['gross_weight_kg'] ?? 0.000,
                        'net_weight_kg' => $itemData['net_weight_kg'] ?? 0.000,
                        'customs_value_usd' => $customsVal,
                        'duty_rate_percent' => $dutyRate,
                        'is_duty_exempt' => $isExempt,
                        'exempt_amount_usd' => $exemptAmount,
                        'notes' => $itemData['notes'] ?? null,
                    ]);
                }

                $this->service->recalculateDeclarationTotals($declaration);
            }

            Audit::record($organization, 'customs_declaration.created', [
                'customs_declaration_id' => $declaration->id,
                'declaration_number' => $declaration->declaration_number,
                'office_code' => $declaration->customs_office_code,
                'regime_code' => $declaration->regime_code,
            ]);

            return $declaration->fresh(['items', 'shipment', 'cdcMasterList', 'declarantPartner', 'consigneePartner']);
        });
    }

    /**
     * Update an ASYCUDA Customs Declaration.
     */
    public function updateDeclaration(OrganizationContext $context, int $id, array $data): CustomsDeclaration
    {
        return $this->organizations->mutate($context, 'customs.declare', function (Organization $organization) use ($id, $data) {
            $declaration = $organization->customsDeclarations()->findOrFail($id);

            if (isset($data['shipment_id']) && $data['shipment_id'] !== null) {
                $this->validateShipment($organization, (int) $data['shipment_id']);
            }
            if (isset($data['cdc_master_list_id']) && $data['cdc_master_list_id'] !== null) {
                $organization->cdcMasterLists()->findOrFail((int) $data['cdc_master_list_id']);
            }

            $declaration->update(array_filter([
                'declaration_date' => $data['declaration_date'] ?? null,
                'declaration_type' => $data['declaration_type'] ?? null,
                'customs_office_code' => $data['customs_office_code'] ?? null,
                'regime_code' => $data['regime_code'] ?? null,
                'inspection_lane' => $data['inspection_lane'] ?? null,
                'declarant_partner_id' => array_key_exists('declarant_partner_id', $data) ? $data['declarant_partner_id'] : $declaration->declarant_partner_id,
                'consignee_partner_id' => array_key_exists('consignee_partner_id', $data) ? $data['consignee_partner_id'] : $declaration->consignee_partner_id,
                'invoice_number' => $data['invoice_number'] ?? null,
                'bill_of_lading_number' => $data['bill_of_lading_number'] ?? null,
                'total_packages' => $data['total_packages'] ?? null,
                'notes' => $data['notes'] ?? null,
            ], fn ($v) => $v !== null));

            Audit::record($organization, 'customs_declaration.updated', [
                'customs_declaration_id' => $declaration->id,
                'declaration_number' => $declaration->declaration_number,
            ]);

            return $declaration->fresh(['items', 'shipment', 'cdcMasterList']);
        });
    }

    /**
     * Add line item to customs declaration.
     */
    public function addDeclarationItem(OrganizationContext $context, int $declarationId, array $data): CustomsDeclarationItem
    {
        return $this->organizations->mutate($context, 'customs.declare', function (Organization $organization) use ($declarationId, $data) {
            $declaration = $organization->customsDeclarations()->findOrFail($declarationId);

            $qty = (float) $data['quantity'];
            $customsVal = (float) ($data['customs_value_usd'] ?? 0);
            $dutyRate = (float) ($data['duty_rate_percent'] ?? 7.0);
            $isExempt = (bool) ($data['is_duty_exempt'] ?? true);
            $exemptAmount = $isExempt ? round($customsVal * ($dutyRate / 100), 2) : 0.00;
            $nextNumber = ($declaration->items()->max('item_number') ?? 0) + 1;

            $item = $declaration->items()->create([
                'organization_id' => $organization->id,
                'cdc_master_item_id' => $data['cdc_master_item_id'] ?? null,
                'item_number' => $data['item_number'] ?? $nextNumber,
                'hs_code' => $data['hs_code'],
                'description' => $data['description'],
                'quantity' => $qty,
                'unit_of_measure' => $data['unit_of_measure'] ?? 'PCS',
                'gross_weight_kg' => $data['gross_weight_kg'] ?? 0.000,
                'net_weight_kg' => $data['net_weight_kg'] ?? 0.000,
                'customs_value_usd' => $customsVal,
                'duty_rate_percent' => $dutyRate,
                'is_duty_exempt' => $isExempt,
                'exempt_amount_usd' => $exemptAmount,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->service->recalculateDeclarationTotals($declaration);

            return $item;
        });
    }

    /**
     * Execute CDC Quota Deductions for a declaration.
     */
    public function deductQuota(OrganizationContext $context, int $declarationId, array $deductions): array
    {
        return $this->organizations->mutate($context, 'customs.deduct_cdc', function (Organization $organization) use ($declarationId, $deductions, $context) {
            $declaration = $organization->customsDeclarations()->findOrFail($declarationId);

            if (! $declaration->cdc_master_list_id) {
                throw ValidationException::withMessages([
                    'cdc_master_list_id' => 'Declaration must be linked to an approved CDC Master List prior to quota deduction.',
                ]);
            }

            $result = $this->service->deductCdcQuota($context, $declaration, $deductions);

            Audit::record($organization, 'cdc_quota.deducted', [
                'customs_declaration_id' => $declaration->id,
                'declaration_number' => $declaration->declaration_number,
                'deductions_count' => $result['deductions_count'],
            ]);

            return $result;
        });
    }

    /**
     * Transition status of customs declaration.
     */
    public function transitionDeclarationStatus(
        OrganizationContext $context,
        int $declarationId,
        string $status,
        ?string $inspectionLane = null,
        ?string $notes = null
    ): CustomsDeclaration {
        return $this->organizations->mutate($context, 'customs.declare', function (Organization $organization) use ($declarationId, $status, $inspectionLane, $notes, $context) {
            $declaration = $organization->customsDeclarations()->findOrFail($declarationId);

            $updated = $this->service->transitionStatus($context, $declaration, $status, $inspectionLane, $notes);

            Audit::record($organization, 'customs_declaration.status_transitioned', [
                'customs_declaration_id' => $declaration->id,
                'old_status' => $declaration->status,
                'new_status' => $status,
                'inspection_lane' => $inspectionLane ?? $declaration->inspection_lane,
            ]);

            return $updated;
        });
    }

    /**
     * Delete a customs declaration.
     */
    public function deleteDeclaration(OrganizationContext $context, int $declarationId): void
    {
        $this->organizations->mutate($context, 'customs.manage', function (Organization $organization) use ($declarationId) {
            $declaration = $organization->customsDeclarations()->findOrFail($declarationId);

            if (in_array($declaration->status, ['cleared', 'released'])) {
                throw ValidationException::withMessages([
                    'status' => 'Cannot delete a cleared or released customs declaration.',
                ]);
            }

            $declaration->delete();

            Audit::record($organization, 'customs_declaration.deleted', [
                'customs_declaration_id' => $declarationId,
            ]);
        });
    }

    private function validateShipment(Organization $organization, int $shipmentId): Shipment
    {
        return $organization->shipments()->findOrFail($shipmentId);
    }
}
