<?php

namespace App\Modules\PurchaseOrders;

use App\Modules\Organizations\OrganizationContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $context = OrganizationContext::from($request);
        $context->authorize('purchase_orders.view');
        $query = $context->organization->purchaseOrders()
            ->with('materialRequest:id,organization_id,request_number,title')
            ->withCount('items')
            ->withSum('items as total_amount', DB::raw('quantity * unit_price'));

        if ($request->filled('status')) {
            abort_unless(in_array($request->query('status'), ['draft', 'issued'], true), 422, 'Invalid status.');
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('q')) {
            $search = mb_substr(trim($request->query('q')), 0, 100);
            $pattern = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';
            $query->where(function (Builder $query) use ($pattern) {
                $query->where('po_number', 'ilike', $pattern)
                    ->orWhere('supplier_name', 'ilike', $pattern)
                    ->orWhereHas('materialRequest', fn (Builder $request) => $request->where('request_number', 'ilike', $pattern));
            });
        }

        return $query->orderByDesc('id')->paginate(min(100, max(1, $request->integer('per_page', 25))));
    }

    public function show(Request $request, int $organization, int $purchaseOrder): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('purchase_orders.view');

        return ['data' => $context->organization->purchaseOrders()
            ->with(['items', 'materialRequest:id,organization_id,request_number,title,needed_by', 'supplier:id,name,code', 'createdBy:id,name'])
            ->findOrFail($purchaseOrder)];
    }

    public function activity(Request $request, int $organization, int $purchaseOrder): array
    {
        $context = OrganizationContext::from($request);
        $context->authorize('purchase_orders.view');
        $context->organization->purchaseOrders()->findOrFail($purchaseOrder);

        return ['data' => $context->organization->audits()
            ->leftJoin('users', 'users.id', '=', 'audit_events.actor_id')
            ->whereRaw("(metadata->>'purchase_order_id')::bigint = ?", [$purchaseOrder])
            ->select('audit_events.id', 'audit_events.action', 'audit_events.created_at', 'users.name as actor_name')
            ->orderByDesc('audit_events.id')->limit(100)->get()];
    }

    public function store(PurchaseOrderFormRequest $request, PurchaseOrderActions $actions): JsonResponse
    {
        return response()->json(['data' => $actions->create(OrganizationContext::from($request), $request->validated())], 201);
    }

    public function update(PurchaseOrderFormRequest $request, int $organization, int $purchaseOrder, PurchaseOrderActions $actions): array
    {
        return ['data' => $actions->update(OrganizationContext::from($request), $purchaseOrder, $request->validated())];
    }

    public function issue(Request $request, int $organization, int $purchaseOrder, PurchaseOrderActions $actions): array
    {
        return ['data' => $actions->issue(OrganizationContext::from($request), $purchaseOrder)];
    }
}
