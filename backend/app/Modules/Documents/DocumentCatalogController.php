<?php

namespace App\Modules\Documents;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\Request;

class DocumentCatalogController extends Controller
{
    public function options(Request $request, int $organization): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('documents.view');
        $org = $context->organization;

        $shipments = $org->shipments()
            ->select('id', 'shipment_number', 'status', 'transport_mode')
            ->orderBy('id', 'desc')
            ->limit(50)
            ->get();

        $stats = [
            'total_documents' => $org->tradeDocuments()->count(),
            'reconciled' => $org->tradeDocuments()->where('status', 'reconciled')->count(),
            'flagged' => $org->tradeDocuments()->where('status', 'flagged')->count(),
            'verified' => $org->tradeDocuments()->where('status', 'verified')->count(),
            'total_reconciliations' => $org->documentReconciliations()->count(),
            'unresolved_reconciliations' => $org->documentReconciliations()->where('status', 'has_discrepancies')->count(),
        ];

        return [
            'data' => [
                'shipments' => $shipments,
                'stats' => $stats,
                'document_types' => [
                    ['value' => 'commercial_invoice', 'label' => 'Commercial Invoice'],
                    ['value' => 'packing_list', 'label' => 'Packing List'],
                    ['value' => 'bill_of_lading', 'label' => 'Bill of Lading (B/L)'],
                    ['value' => 'cdc_master_list', 'label' => 'CDC Master List'],
                    ['value' => 'delivery_order', 'label' => 'Delivery Order (D/O)'],
                    ['value' => 'customs_declaration', 'label' => 'Customs Declaration'],
                    ['value' => 'other', 'label' => 'Other Trade Document'],
                ],
            ],
        ];
    }
}
