<?php

namespace App\Modules\Customs;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\Request;

class CustomsCatalogController extends Controller
{
    public function options(Request $request): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('customs.view');
        $org = $context->organization;

        $stats = [
            'total_declarations' => $org->customsDeclarations()->count(),
            'cleared_declarations' => $org->customsDeclarations()->where('status', 'cleared')->count(),
            'under_inspection' => $org->customsDeclarations()->where('status', 'under_inspection')->count(),
            'total_cdc_lists' => $org->cdcMasterLists()->count(),
            'total_cdc_exemption_usd' => (float) $org->customsDeclarations()->sum('duty_exemption_amount_usd'),
        ];

        return [
            'data' => [
                'stats' => $stats,
                'customs_offices' => [
                    ['code' => 'KHKAS', 'name' => 'Sihanoukville Autonomous Port (PAS)', 'city' => 'Sihanoukville'],
                    ['code' => 'KHPNH', 'name' => 'Phnom Penh International Port / Dry Port', 'city' => 'Phnom Penh'],
                    ['code' => 'KHBAT', 'name' => 'Bavet International Border Gate (Cambodia-Vietnam)', 'city' => 'Bavet'],
                    ['code' => 'KHPOI', 'name' => 'Poipet International Border Gate (Cambodia-Thailand)', 'city' => 'Poipet'],
                    ['code' => 'KHTRO', 'name' => 'Trapeang Kreal Border (Cambodia-Laos)', 'city' => 'Stung Treng'],
                ],
                'regimes' => [
                    ['code' => 'IM 4', 'name' => 'Direct Import for Domestic Use (QIP Duty Free Exemption)'],
                    ['code' => 'IM 7', 'name' => 'Customs Bonded Warehouse'],
                    ['code' => 'EX 1', 'name' => 'Permanent Direct Export'],
                    ['code' => 'IM 8', 'name' => 'Customs Transit (Cross-Border Through Transit)'],
                ],
                'inspection_lanes' => [
                    ['lane' => 'green', 'label' => 'Green Lane (Direct Release / No Inspection)'],
                    ['lane' => 'blue', 'label' => 'Blue Lane (Post-Clearance Audit / PCA Verification)'],
                    ['lane' => 'yellow', 'label' => 'Yellow Lane (Documentary Check / Tariff Scrutiny)'],
                    ['lane' => 'red', 'label' => 'Red Lane (Physical Cargo & Container Inspection)'],
                ],
                'declaration_statuses' => [
                    ['value' => 'draft', 'label' => 'Draft Declaration'],
                    ['value' => 'cdc_deducted', 'label' => 'CDC Quota Deducted'],
                    ['value' => 'lodged', 'label' => 'Lodged in ASYCUDA World'],
                    ['value' => 'under_inspection', 'label' => 'Under Customs Inspection'],
                    ['value' => 'cleared', 'label' => 'Customs Cleared & Tax Exempted'],
                    ['value' => 'released', 'label' => 'Gate Release Order Issued'],
                    ['value' => 'rejected', 'label' => 'Rejected / Disputed by Customs'],
                ],
                'cdc_master_lists' => $org->cdcMasterLists()->with('items')->get(),
                'shipments' => $org->shipments()->select('id', 'shipment_number', 'status', 'transport_mode', 'customs_status')->orderBy('id', 'desc')->limit(50)->get(),
                'brokers' => $org->partners()->whereJsonContains('roles', 'broker')->select('id', 'name')->get(),
            ],
        ];
    }
}
