<?php

namespace App\Modules\PurchaseOrders;

use App\Modules\Audit\Audit;
use App\Modules\MaterialRequests\MaterialRequest;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use App\Modules\Partners\BusinessPartner;

final class PurchaseOrderActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function create(OrganizationContext $context, array $data): PurchaseOrder
    {
        return $this->organizations->mutate($context, 'purchase_orders.manage', function (Organization $organization) use ($context, $data) {
            $request = $organization->materialRequests()->findOrFail($data['material_request_id']);
            abort_unless($request->status === 'submitted', 409, 'Submit the material request before creating a purchase order.');
            abort_if($request->purchaseOrder()->exists(), 409, 'This material request already has a purchase order.');
            $supplier = $this->supplier($organization, $data['supplier_partner_id']);

            $number = sprintf('PO-%s-%04d', now()->format('Y'), $organization->purchaseOrders()->whereYear('created_at', now()->year)->count() + 1);
            $order = $organization->purchaseOrders()->create([
                'material_request_id' => $request->id,
                'supplier_partner_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'po_number' => $number,
                'currency' => $organization->currency,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $context->membership->user_id,
            ]);
            $this->syncItems($order, $request, $data['items']);
            Audit::record($organization, 'purchase_order.created', ['purchase_order_id' => $order->id, 'material_request_id' => $request->id]);

            return $this->details($order);
        });
    }

    public function update(OrganizationContext $context, int $id, array $data): PurchaseOrder
    {
        return $this->organizations->mutate($context, 'purchase_orders.manage', function (Organization $organization) use ($id, $data) {
            $order = $organization->purchaseOrders()->findOrFail($id);
            abort_unless($order->status === 'draft', 409, 'Issued purchase orders cannot be edited.');
            abort_unless($order->material_request_id === (int) $data['material_request_id'], 422, 'The source material request cannot be changed.');
            $request = $organization->materialRequests()->findOrFail($order->material_request_id);
            $supplier = $this->supplier($organization, $data['supplier_partner_id']);

            $this->syncItems($order, $request, $data['items']);
            $order->update([
                'supplier_partner_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
            Audit::record($organization, 'purchase_order.updated', ['purchase_order_id' => $id]);

            return $this->details($order);
        });
    }

    public function issue(OrganizationContext $context, int $id): PurchaseOrder
    {
        return $this->organizations->mutate($context, 'purchase_orders.manage', function (Organization $organization) use ($id) {
            $order = $organization->purchaseOrders()->findOrFail($id);
            abort_unless($order->status === 'draft', 409, 'This purchase order has already been issued.');
            abort_if($order->items()->doesntExist(), 422, 'Add at least one item before issuing.');
            $this->supplier($organization, $order->supplier_partner_id);
            $order->update(['status' => 'issued', 'issued_at' => now()]);
            Audit::record($organization, 'purchase_order.issued', ['purchase_order_id' => $id]);

            return $this->details($order);
        });
    }

    private function supplier(Organization $organization, int $id): BusinessPartner
    {
        $supplier = $organization->partners()->findOrFail($id);
        $supplier->ensureActive();
        abort_unless(in_array('supplier', $supplier->roles ?? [], true), 422, 'Choose a partner with the supplier role.');

        return $supplier;
    }

    private function syncItems(PurchaseOrder $order, MaterialRequest $request, array $items): void
    {
        $sourceIds = array_column($items, 'material_request_item_id');
        $sources = $request->items()->whereIn('id', $sourceIds)->get()->keyBy('id');
        abort_unless($sources->count() === count($items), 404, 'A material does not belong to this request.');
        abort_unless($request->items()->count() === count($items), 422, 'Include every material from the request.');

        foreach ($items as $item) {
            $source = $sources->get($item['material_request_item_id']);
            abort_if(bccomp((string) $item['quantity'], (string) $source->quantity, 3) > 0, 422, 'An ordered quantity exceeds the requested quantity.');
        }

        $order->items()->delete();
        foreach ($items as $index => $item) {
            $source = $sources->get($item['material_request_item_id']);
            $order->items()->create([
                'organization_id' => $order->organization_id,
                'material_request_id' => $request->id,
                'material_request_item_id' => $source->id,
                'line_number' => $index + 1,
                'description' => $source->description,
                'specification' => $source->specification,
                'quantity' => $item['quantity'],
                'unit' => $source->unit,
                'unit_price' => $item['unit_price'],
            ]);
        }
    }

    private function details(PurchaseOrder $order): PurchaseOrder
    {
        return $order->load(['items', 'materialRequest:id,organization_id,request_number,title,needed_by', 'supplier:id,name,code', 'createdBy:id,name']);
    }
}
