<?php

namespace App\Modules\MaterialRequests;

use App\Modules\Audit\Audit;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;

final class MaterialRequestActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function create(OrganizationContext $context, array $data): MaterialRequest
    {
        return $this->organizations->mutate($context, 'material_requests.manage', function (Organization $organization) use ($context, $data) {
            $items = $data['items'];
            unset($data['items']);

            $number = sprintf('MR-%s-%04d', now()->format('Y'), $organization->materialRequests()->whereYear('created_at', now()->year)->count() + 1);
            $request = $organization->materialRequests()->create([
                ...$data,
                'request_number' => $number,
                'requested_by_user_id' => $context->membership->user_id,
            ]);
            $this->syncItems($request, $items);
            Audit::record($organization, 'material_request.created', ['material_request_id' => $request->id]);

            return $request->load(['items', 'requestedBy:id,name']);
        });
    }

    public function update(OrganizationContext $context, int $id, array $data): MaterialRequest
    {
        return $this->organizations->mutate($context, 'material_requests.manage', function (Organization $organization) use ($id, $data) {
            $request = $organization->materialRequests()->findOrFail($id);
            abort_unless($request->status === 'draft', 409, 'Submitted requests cannot be edited.');
            $items = $data['items'];
            unset($data['items']);

            $this->syncItems($request, $items);
            $request->update($data);
            Audit::record($organization, 'material_request.updated', ['material_request_id' => $id, 'fields' => array_keys($data)]);

            return $request->load(['items', 'requestedBy:id,name']);
        });
    }

    public function submit(OrganizationContext $context, int $id): MaterialRequest
    {
        return $this->organizations->mutate($context, 'material_requests.manage', function (Organization $organization) use ($id) {
            $request = $organization->materialRequests()->findOrFail($id);
            abort_unless($request->status === 'draft', 409, 'This request has already been submitted.');
            abort_if($request->items()->doesntExist(), 422, 'Add at least one material before submitting.');
            $request->update(['status' => 'submitted', 'submitted_at' => now()]);
            Audit::record($organization, 'material_request.submitted', ['material_request_id' => $id]);

            return $request->load(['items', 'requestedBy:id,name']);
        });
    }

    private function syncItems(MaterialRequest $request, array $items): void
    {
        $existingIds = [];
        foreach ($items as $item) {
            if (isset($item['id'])) {
                $request->items()->findOrFail($item['id']);
                $existingIds[] = (int) $item['id'];
            }
        }

        $request->items()->whereNotIn('id', $existingIds)->delete();
        $request->items()->whereIn('id', $existingIds)->increment('line_number', 1000);
        foreach ($items as $index => $item) {
            $existing = isset($item['id']) ? $request->items()->findOrFail($item['id']) : new MaterialRequestItem;
            $existing->fill([
                'description' => $item['description'],
                'specification' => $item['specification'] ?? null,
                'quantity' => $item['quantity'],
                'unit' => mb_strtoupper(trim($item['unit'])),
            ]);
            $existing->organization_id = $request->organization_id;
            $existing->line_number = $index + 1;
            $request->items()->save($existing);
        }
    }
}
