<?php

namespace App\Modules\Freight;

use App\Modules\Audit\Audit;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Support\Str;

final class FreightActions
{
    public function __construct(private OrganizationActions $organizations) {}

    // ------------------------------------------------------------------------
    // Freight Requests
    // ------------------------------------------------------------------------

    public function createFreightRequest(OrganizationContext $context, array $data): FreightRequest
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($data) {
            $data['request_number'] = $this->generateNumber($data['request_number'] ?? null, 'REQ', $organization->freightRequests());
            $this->validateForeignEntities($organization, $data);

            $request = $organization->freightRequests()->create($data);
            Audit::record($organization, 'freight_request.created', ['freight_request_id' => $request->id, 'number' => $request->request_number]);

            return $request;
        });
    }

    public function updateFreightRequest(OrganizationContext $context, int $id, array $data): FreightRequest
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($id, $data) {
            $request = $organization->freightRequests()->findOrFail($id);
            $this->validateForeignEntities($organization, $data);

            $request->update($data);
            Audit::record($organization, 'freight_request.updated', ['freight_request_id' => $id, 'fields' => array_keys($data)]);

            return $request;
        });
    }

    // ------------------------------------------------------------------------
    // Quotations
    // ------------------------------------------------------------------------

    public function createQuotation(OrganizationContext $context, array $data, array $lineItems = []): Quotation
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($data, $lineItems) {
            $data['quotation_number'] = $this->generateNumber($data['quotation_number'] ?? null, 'QUO', $organization->quotations(), 'quotation_number');
            $data['revision'] = 0;
            $this->validateForeignEntities($organization, $data);

            $calculated = $this->calculateTotals($lineItems);
            $data['subtotal_amount'] = $calculated['subtotal'];
            $data['total_amount'] = $calculated['total'];

            $quotation = $organization->quotations()->create($data);

            foreach ($lineItems as $item) {
                $item['organization_id'] = $organization->id;
                $item['total_amount'] = round((float) ($item['quantity'] ?? 1) * (float) ($item['unit_price'] ?? 0), 2);
                $quotation->lineItems()->create($item);
            }

            Audit::record($organization, 'quotation.created', ['quotation_id' => $quotation->id, 'number' => $quotation->quotation_number]);

            return $quotation->load('lineItems');
        });
    }

    public function reviseQuotation(OrganizationContext $context, int $id, array $data, array $lineItems = []): Quotation
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($id, $data, $lineItems) {
            $previous = $organization->quotations()->with('lineItems')->findOrFail($id);
            $nextRevision = $organization->quotations()->where('quotation_number', $previous->quotation_number)->max('revision') + 1;

            $newData = array_merge($previous->toArray(), $data);
            unset($newData['id'], $newData['created_at'], $newData['updated_at'], $newData['line_items']);
            $newData['revision'] = $nextRevision;
            $newData['status'] = 'draft';

            $calculated = $this->calculateTotals($lineItems);
            $newData['subtotal_amount'] = $calculated['subtotal'];
            $newData['total_amount'] = $calculated['total'];

            $revised = $organization->quotations()->create($newData);

            foreach ($lineItems as $item) {
                unset($item['id']);
                $item['organization_id'] = $organization->id;
                $item['total_amount'] = round((float) ($item['quantity'] ?? 1) * (float) ($item['unit_price'] ?? 0), 2);
                $revised->lineItems()->create($item);
            }

            Audit::record($organization, 'quotation.revised', [
                'previous_id' => $id,
                'quotation_id' => $revised->id,
                'quotation_number' => $revised->quotation_number,
                'revision' => $nextRevision,
            ]);

            return $revised->load('lineItems');
        });
    }

    public function updateQuotationStatus(OrganizationContext $context, int $id, string $status): Quotation
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($id, $status) {
            $quotation = $organization->quotations()->findOrFail($id);
            $quotation->status = $status;
            $quotation->save();

            Audit::record($organization, 'quotation.status_changed', ['quotation_id' => $id, 'status' => $status]);

            return $quotation;
        });
    }

    // ------------------------------------------------------------------------
    // Bookings (Orders)
    // ------------------------------------------------------------------------

    public function createBooking(OrganizationContext $context, array $data, array $cargoItems = []): Booking
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($data, $cargoItems) {
            $data['booking_number'] = $this->generateNumber($data['booking_number'] ?? null, 'BK', $organization->bookings(), 'booking_number');
            $this->validateForeignEntities($organization, $data);

            $booking = $organization->bookings()->create($data);

            foreach ($cargoItems as $item) {
                $item['organization_id'] = $organization->id;
                $booking->cargoItems()->create($item);
            }

            Audit::record($organization, 'booking.created', ['booking_id' => $booking->id, 'number' => $booking->booking_number]);

            return $booking->load('cargoItems');
        });
    }

    public function updateBooking(OrganizationContext $context, int $id, array $data): Booking
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($id, $data) {
            $booking = $organization->bookings()->findOrFail($id);
            $this->validateForeignEntities($organization, $data);

            $booking->update($data);
            Audit::record($organization, 'booking.updated', ['booking_id' => $id, 'fields' => array_keys($data)]);

            return $booking;
        });
    }

    // ------------------------------------------------------------------------
    // Shipments & Milestones
    // ------------------------------------------------------------------------

    public function createShipment(
        OrganizationContext $context,
        array $data,
        array $cargoItems = [],
        array $legs = [],
        array $participants = []
    ): Shipment {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($data, $cargoItems, $legs, $participants) {
            $data['shipment_number'] = $this->generateNumber($data['shipment_number'] ?? null, 'SH', $organization->shipments(), 'shipment_number');
            $this->validateForeignEntities($organization, $data);

            $shipment = $organization->shipments()->create($data);

            // Cargo Items
            foreach ($cargoItems as $cargo) {
                $cargo['organization_id'] = $organization->id;
                $shipment->cargoItems()->create($cargo);
            }

            // Transport Legs
            $seq = 1;
            foreach ($legs as $leg) {
                $leg['organization_id'] = $organization->id;
                $leg['sequence'] = $leg['sequence'] ?? $seq++;
                $this->validateForeignEntities($organization, $leg);
                $shipment->legs()->create($leg);
            }

            // Participants
            foreach ($participants as $part) {
                $part['organization_id'] = $organization->id;
                $this->validateForeignEntities($organization, $part);
                $shipment->participants()->create($part);
            }

            // Initial milestone
            $shipment->milestones()->create([
                'organization_id' => $organization->id,
                'code' => 'SHIPMENT_CREATED',
                'title' => 'Shipment planned and created',
                'description' => 'Initial operational file opened in Mekong',
                'occurred_at' => now(),
                'created_by_user_id' => auth()->id(),
            ]);

            Audit::record($organization, 'shipment.created', ['shipment_id' => $shipment->id, 'number' => $shipment->shipment_number]);

            return $shipment->load(['cargoItems', 'legs', 'participants', 'milestones']);
        });
    }

    public function updateShipment(OrganizationContext $context, int $id, array $data): Shipment
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($id, $data) {
            $shipment = $organization->shipments()->lockForUpdate()->findOrFail($id);
            $this->validateForeignEntities($organization, $data);

            $shipment->update($data);
            Audit::record($organization, 'shipment.updated', ['shipment_id' => $id, 'fields' => array_keys($data)]);

            return $shipment;
        });
    }

    public function addMilestone(OrganizationContext $context, int $shipmentId, array $data): ShipmentMilestone
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($shipmentId, $data) {
            $shipment = $organization->shipments()->lockForUpdate()->findOrFail($shipmentId);

            $data['organization_id'] = $organization->id;
            $data['created_by_user_id'] = auth()->id();
            $data['occurred_at'] = $data['occurred_at'] ?? now();

            if (!empty($data['location_id'])) {
                $organization->locations()->findOrFail($data['location_id']);
            }
            if (!empty($data['shipment_leg_id'])) {
                $shipment->legs()->findOrFail($data['shipment_leg_id']);
            }

            $milestone = $shipment->milestones()->create($data);

            // Auto-advance statuses if appropriate
            if ($data['code'] === 'DISPATCHED' && in_array($shipment->status, ['draft', 'planned'], true)) {
                $shipment->update(['status' => 'dispatched']);
            } elseif ($data['code'] === 'IN_TRANSIT') {
                $shipment->update(['status' => 'in_transit']);
            } elseif ($data['code'] === 'CUSTOMS_CLEARED') {
                $shipment->update(['customs_status' => 'cleared']);
            } elseif ($data['code'] === 'DELIVERED') {
                $shipment->update(['status' => 'delivered', 'ata' => $data['occurred_at']]);
            }

            Audit::record($organization, 'shipment_milestone.created', [
                'shipment_id' => $shipmentId,
                'milestone_id' => $milestone->id,
                'code' => $milestone->code,
            ]);

            return $milestone;
        });
    }

    public function saveLeg(OrganizationContext $context, int $shipmentId, ?int $legId, array $data): ShipmentLeg
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($shipmentId, $legId, $data) {
            $shipment = $organization->shipments()->lockForUpdate()->findOrFail($shipmentId);
            $this->validateForeignEntities($organization, $data);

            if ($legId === null) {
                $data['organization_id'] = $organization->id;
                $data['sequence'] = $data['sequence'] ?? ($shipment->legs()->max('sequence') + 1);
                $leg = $shipment->legs()->create($data);
                Audit::record($organization, 'shipment_leg.created', ['shipment_id' => $shipmentId, 'leg_id' => $leg->id]);
            } else {
                $leg = $shipment->legs()->findOrFail($legId);
                $leg->update($data);
                Audit::record($organization, 'shipment_leg.updated', ['shipment_id' => $shipmentId, 'leg_id' => $legId]);
            }

            return $leg;
        });
    }

    public function saveCargoItem(OrganizationContext $context, ?int $shipmentId, ?int $bookingId, ?int $itemId, array $data): CargoItem
    {
        return $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($shipmentId, $bookingId, $itemId, $data) {
            $data['organization_id'] = $organization->id;

            if ($shipmentId !== null) {
                $parent = $organization->shipments()->findOrFail($shipmentId);
                $relation = $parent->cargoItems();
            } elseif ($bookingId !== null) {
                $parent = $organization->bookings()->findOrFail($bookingId);
                $relation = $parent->cargoItems();
            } else {
                abort(422, 'Either shipment_id or booking_id is required for a cargo item.');
            }

            if ($itemId === null) {
                $item = $relation->create($data);
                Audit::record($organization, 'cargo_item.created', ['cargo_item_id' => $item->id]);
            } else {
                $item = $relation->findOrFail($itemId);
                $item->update($data);
                Audit::record($organization, 'cargo_item.updated', ['cargo_item_id' => $itemId]);
            }

            return $item;
        });
    }

    public function deleteCargoItem(OrganizationContext $context, int $itemId): void
    {
        $this->organizations->mutate($context, 'freight.manage', function (Organization $organization) use ($itemId) {
            $item = CargoItem::where('organization_id', $organization->id)->findOrFail($itemId);
            $item->delete();
            Audit::record($organization, 'cargo_item.deleted', ['cargo_item_id' => $itemId]);
        });
    }

    // ------------------------------------------------------------------------
    // Helpers & Foreign Entity Validation
    // ------------------------------------------------------------------------

    private function validateForeignEntities(Organization $organization, array $data): void
    {
        $partnerFields = ['customer_id', 'shipper_id', 'consignee_id', 'carrier_id', 'business_partner_id'];
        foreach ($partnerFields as $field) {
            if (!empty($data[$field])) {
                $organization->partners()->findOrFail($data[$field]);
            }
        }

        $locationFields = ['origin_location_id', 'destination_location_id', 'location_id'];
        foreach ($locationFields as $field) {
            if (!empty($data[$field])) {
                $organization->locations()->findOrFail($data[$field]);
            }
        }

        if (!empty($data['freight_request_id'])) {
            $organization->freightRequests()->findOrFail($data['freight_request_id']);
        }
        if (!empty($data['quotation_id'])) {
            $organization->quotations()->findOrFail($data['quotation_id']);
        }
        if (!empty($data['booking_id'])) {
            $organization->bookings()->findOrFail($data['booking_id']);
        }
    }

    private function generateNumber(?string $explicit, string $prefix, $query, string $column = 'request_number'): string
    {
        if (!empty(trim((string) $explicit))) {
            return trim($explicit);
        }

        $year = date('Y');
        $count = $query->whereYear('created_at', $year)->count() + 1;

        return sprintf('%s-%s-%04d', $prefix, $year, $count);
    }

    private function calculateTotals(array $lineItems): array
    {
        $subtotal = 0;
        foreach ($lineItems as $item) {
            $qty = (float) ($item['quantity'] ?? 1);
            $unit = (float) ($item['unit_price'] ?? 0);
            $subtotal += ($qty * $unit);
        }

        return [
            'subtotal' => round($subtotal, 2),
            'total' => round($subtotal, 2),
        ];
    }
}
