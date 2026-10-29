<?php

namespace App\Modules\Customs;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CdcMasterListController extends Controller
{
    public function __construct(private CustomsActions $actions) {}

    public function index(Request $request): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $context->authorize('customs.view');
        $org = $context->organization;

        $query = $org->cdcMasterLists()->withCount('items');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($year = $request->query('effective_year')) {
            $query->where('effective_year', (int) $year);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('qip_number', 'ilike', "%{$search}%")
                    ->orWhere('company_name', 'ilike', "%{$search}%")
                    ->orWhere('approval_reference', 'ilike', "%{$search}%");
            });
        }

        $lists = $query->orderBy('id', 'desc')->paginate((int) $request->query('per_page', 25));

        return response()->json($lists);
    }

    public function store(CdcMasterListRequest $request): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $list = $this->actions->createCdcMasterList($context, $request->validated());

        return response()->json(['data' => $list], 201);
    }

    public function show(Request $request, int $organization, int $masterList): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('customs.view');
        $list = $context->organization->cdcMasterLists()
            ->with(['items.deductions', 'declarations'])
            ->findOrFail($masterList);

        return ['data' => $list];
    }

    public function addItem(CdcMasterItemRequest $request, int $organization, int $masterList): JsonResponse
    {
        $context = OrganizationContext::from($request);
        $item = $this->actions->addCdcMasterItem($context, $masterList, $request->validated());

        return response()->json(['data' => $item], 201);
    }
}
