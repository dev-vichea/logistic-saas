<?php

namespace App\Modules\Customs;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CdcQuotaDeductionController extends Controller
{
    public function __construct(private CustomsActions $actions) {}

    public function index(Request $request): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $context->authorize('customs.view');
        $org = $context->organization;

        $query = CdcQuotaDeduction::where('organization_id', $org->id)
            ->with(['cdcMasterItem.masterList', 'declaration', 'shipment', 'createdByUser']);

        if ($masterItemId = $request->query('cdc_master_item_id')) {
            $query->where('cdc_master_item_id', (int) $masterItemId);
        }
        if ($declarationId = $request->query('customs_declaration_id')) {
            $query->where('customs_declaration_id', (int) $declarationId);
        }
        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', (int) $shipmentId);
        }

        $deductions = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 25));

        return response()->json($deductions);
    }

    public function deduct(CdcQuotaDeductionRequest $request, int $organization, int $declaration): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $result = $this->actions->deductQuota($context, $declaration, $request->input('deductions'));

        return response()->json($result);
    }
}
