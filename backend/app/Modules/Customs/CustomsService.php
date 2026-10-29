<?php

namespace App\Modules\Customs;

use App\Modules\Freight\Shipment;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomsService
{
    /**
     * Deduct CDC quota against a customs declaration and its items.
     *
     * @param  array<int, array{declaration_item_id: int, cdc_master_item_id: int, quantity: float}>  $deductions
     * @return array{declaration: CustomsDeclaration, deductions_count: int}
     */
    public function deductCdcQuota(
        OrganizationContext $context,
        CustomsDeclaration $declaration,
        array $deductions
    ): array {
        $org = $context->organization;
        $userId = $context->membership->user_id;

        $createdDeductions = [];

        foreach ($deductions as $entry) {
            $declItem = $declaration->items()->where('organization_id', $org->id)->findOrFail($entry['declaration_item_id']);
            $masterItem = $org->cdcMasterLists()
                ->findOrFail($declaration->cdc_master_list_id)
                ->items()
                ->where('organization_id', $org->id)
                ->findOrFail($entry['cdc_master_item_id']);

            $qtyToDeduct = (float) $entry['quantity'];

            if ($qtyToDeduct <= 0) {
                continue;
            }

            if ((float) $masterItem->remaining_quantity < $qtyToDeduct) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient CDC quota for item #{$masterItem->item_number} [{$masterItem->description_english}]. Remaining: {$masterItem->remaining_quantity}, requested: {$qtyToDeduct}.",
                ]);
            }

            $balanceBefore = (float) $masterItem->remaining_quantity;
            $balanceAfter = $balanceBefore - $qtyToDeduct;

            $masterItem->consumed_quantity = (float) $masterItem->consumed_quantity + $qtyToDeduct;
            $masterItem->remaining_quantity = $balanceAfter;
            $masterItem->save();

            $ref = 'CUT-'.date('Ymd').'-'.Str::upper(Str::random(6));

            $deduction = CdcQuotaDeduction::create([
                'organization_id' => $org->id,
                'cdc_master_item_id' => $masterItem->id,
                'customs_declaration_id' => $declaration->id,
                'customs_declaration_item_id' => $declItem->id,
                'shipment_id' => $declaration->shipment_id,
                'deduction_reference' => $ref,
                'deducted_quantity' => $qtyToDeduct,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'deducted_at' => now(),
                'created_by_user_id' => $userId,
                'notes' => $entry['notes'] ?? "Applied to declaration {$declaration->declaration_number}",
            ]);

            $declItem->cdc_master_item_id = $masterItem->id;
            $declItem->is_duty_exempt = true;
            // Estimated exempt duty calculation (e.g. 7% duty rate savings)
            $declItem->exempt_amount_usd = round(((float) $declItem->customs_value_usd) * 0.07, 2);
            $declItem->save();

            $createdDeductions[] = $deduction;
        }

        // Recalculate totals
        $this->recalculateDeclarationTotals($declaration);

        $declaration->status = 'cdc_deducted';
        $declaration->save();

        if ($declaration->shipment_id) {
            $declaration->shipment->customs_status = 'declaration_drafted';
            $declaration->shipment->save();
        }

        return [
            'declaration' => $declaration->fresh(['items', 'deductions.cdcMasterItem', 'cdcMasterList']),
            'deductions_count' => count($createdDeductions),
        ];
    }

    /**
     * Recalculate customs valuation, duty exemption, and taxes for declaration.
     */
    public function recalculateDeclarationTotals(CustomsDeclaration $declaration): void
    {
        $declaration->load('items');

        $totalPackages = 0;
        $totalGrossWeight = 0.0;
        $totalNetWeight = 0.0;
        $customsValue = 0.0;
        $exemptAmount = 0.0;
        $payableDuty = 0.0;
        $payableVat = 0.0;

        foreach ($declaration->items as $item) {
            $totalGrossWeight += (float) $item->gross_weight_kg;
            $totalNetWeight += (float) $item->net_weight_kg;
            $val = (float) $item->customs_value_usd;
            $customsValue += $val;

            if ($item->is_duty_exempt) {
                $exemptAmount += (float) $item->exempt_amount_usd;
            } else {
                $dutyRate = (float) $item->duty_rate_percent / 100.0;
                $duty = round($val * $dutyRate, 2);
                $payableDuty += $duty;
                $vat = round(($val + $duty) * 0.10, 2); // 10% standard VAT
                $payableVat += $vat;
            }
        }

        $declaration->total_gross_weight_kg = $totalGrossWeight;
        $declaration->total_net_weight_kg = $totalNetWeight;
        $declaration->customs_value_usd = $customsValue;
        $declaration->duty_exemption_amount_usd = $exemptAmount;
        $declaration->payable_duty_usd = $payableDuty;
        $declaration->payable_vat_usd = $payableVat;
        $declaration->save();
    }

    /**
     * Transition status with automated operational side-effects.
     */
    public function transitionStatus(
        OrganizationContext $context,
        CustomsDeclaration $declaration,
        string $newStatus,
        ?string $inspectionLane = null,
        ?string $notes = null
    ): CustomsDeclaration {
        $validStatuses = ['draft', 'cdc_deducted', 'lodged', 'under_inspection', 'cleared', 'released', 'rejected'];
        if (! in_array($newStatus, $validStatuses, true)) {
            throw ValidationException::withMessages(['status' => "Invalid customs declaration status [{$newStatus}]."]);
        }

        $declaration->status = $newStatus;

        if ($inspectionLane) {
            $declaration->inspection_lane = $inspectionLane;
        }

        if ($notes) {
            $declaration->notes = $declaration->notes ? ($declaration->notes."\n".$notes) : $notes;
        }

        if ($newStatus === 'cleared') {
            $declaration->cleared_at = now();
            if ($declaration->shipment_id && $declaration->shipment) {
                $shipment = $declaration->shipment;
                $shipment->customs_status = 'cleared';
                $shipment->save();

                // Create milestone on shipment
                $shipment->milestones()->create([
                    'organization_id' => $context->organization->id,
                    'code' => 'CUSTOMS_CLEARED',
                    'title' => 'ASYCUDA Customs Cleared',
                    'description' => "Declaration {$declaration->declaration_number} passed inspection ({$declaration->inspection_lane} lane) and cleared customs.",
                    'occurred_at' => now(),
                    'created_by_user_id' => $context->membership->user_id,
                ]);
            }
        } elseif ($newStatus === 'released') {
            $declaration->released_at = now();
            if ($declaration->shipment_id && $declaration->shipment) {
                $shipment = $declaration->shipment;
                $shipment->customs_status = 'released';
                $shipment->save();

                $shipment->milestones()->create([
                    'organization_id' => $context->organization->id,
                    'code' => 'CUSTOMS_RELEASED',
                    'title' => 'Port / Customs Gate Released',
                    'description' => "Cargo released under declaration {$declaration->declaration_number}.",
                    'occurred_at' => now(),
                    'created_by_user_id' => $context->membership->user_id,
                ]);
            }
        } elseif ($newStatus === 'lodged' && $declaration->shipment_id && $declaration->shipment) {
            $declaration->shipment->customs_status = 'declaration_drafted';
            $declaration->shipment->save();
        } elseif ($newStatus === 'under_inspection' && $declaration->shipment_id && $declaration->shipment) {
            $declaration->shipment->customs_status = 'under_inspection';
            $declaration->shipment->save();
        }

        $declaration->save();

        return $declaration->fresh(['items', 'deductions', 'shipment']);
    }
}
