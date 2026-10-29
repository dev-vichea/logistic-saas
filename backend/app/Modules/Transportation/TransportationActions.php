<?php

namespace App\Modules\Transportation;

use App\Modules\Audit\Audit;
use App\Modules\Freight\Shipment;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Validation\ValidationException;

final class TransportationActions
{
    public function __construct(private OrganizationActions $organizations) {}

    // ------------------------------------------------------------------------
    // Vehicles
    // ------------------------------------------------------------------------

    public function createVehicle(OrganizationContext $context, array $data): Vehicle
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($data) {
            $this->validateCarrierPartner($organization, $data['carrier_partner_id'] ?? null);

            $vehicle = $organization->vehicles()->create($data);
            Audit::record($organization, 'vehicle.created', [
                'vehicle_id' => $vehicle->id,
                'plate_number' => $vehicle->plate_number,
                'type' => $vehicle->type,
            ]);

            return $vehicle;
        });
    }

    public function updateVehicle(OrganizationContext $context, int $id, array $data): Vehicle
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($id, $data) {
            $vehicle = $organization->vehicles()->findOrFail($id);
            if (array_key_exists('carrier_partner_id', $data)) {
                $this->validateCarrierPartner($organization, $data['carrier_partner_id']);
            }

            $vehicle->update($data);
            Audit::record($organization, 'vehicle.updated', [
                'vehicle_id' => $id,
                'fields' => array_keys($data),
            ]);

            return $vehicle;
        });
    }

    // ------------------------------------------------------------------------
    // Drivers
    // ------------------------------------------------------------------------

    public function createDriver(OrganizationContext $context, array $data): Driver
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($data) {
            $this->validateCarrierPartner($organization, $data['carrier_partner_id'] ?? null);

            $driver = $organization->drivers()->create($data);
            Audit::record($organization, 'driver.created', [
                'driver_id' => $driver->id,
                'full_name' => $driver->full_name,
                'license_number' => $driver->license_number,
            ]);

            return $driver;
        });
    }

    public function updateDriver(OrganizationContext $context, int $id, array $data): Driver
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($id, $data) {
            $driver = $organization->drivers()->findOrFail($id);
            if (array_key_exists('carrier_partner_id', $data)) {
                $this->validateCarrierPartner($organization, $data['carrier_partner_id']);
            }

            $driver->update($data);
            Audit::record($organization, 'driver.updated', [
                'driver_id' => $id,
                'fields' => array_keys($data),
            ]);

            return $driver;
        });
    }

    // ------------------------------------------------------------------------
    // Dispatch Trips
    // ------------------------------------------------------------------------

    public function createTrip(OrganizationContext $context, array $data): DispatchTrip
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($data) {
            $legIds = $data['shipment_leg_ids'] ?? [];
            unset($data['shipment_leg_ids']);

            $data['trip_number'] = $this->generateTripNumber($data['trip_number'] ?? null, $organization);
            $this->validateTripForeignEntities($organization, $data);

            $trip = $organization->dispatchTrips()->create($data);

            if (! empty($legIds)) {
                $this->syncTripLegs($organization, $trip, $legIds);
            }

            Audit::record($organization, 'dispatch_trip.created', [
                'dispatch_trip_id' => $trip->id,
                'trip_number' => $trip->trip_number,
                'legs_count' => count($legIds),
            ]);

            return $trip;
        });
    }

    public function updateTrip(OrganizationContext $context, int $id, array $data): DispatchTrip
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($id, $data) {
            $trip = $organization->dispatchTrips()->findOrFail($id);

            $hasLegs = array_key_exists('shipment_leg_ids', $data);
            $legIds = $data['shipment_leg_ids'] ?? [];
            unset($data['shipment_leg_ids']);

            $this->validateTripForeignEntities($organization, $data);
            $trip->update($data);

            if ($hasLegs) {
                $this->syncTripLegs($organization, $trip, $legIds);
            }

            Audit::record($organization, 'dispatch_trip.updated', [
                'dispatch_trip_id' => $id,
                'fields' => array_keys($data),
            ]);

            return $trip;
        });
    }

    public function dispatchTrip(OrganizationContext $context, int $id, array $data = []): DispatchTrip
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($context, $id, $data) {
            $trip = $organization->dispatchTrips()->with(['vehicle', 'driver', 'tripLegs.shipmentLeg.shipment'])->findOrFail($id);

            $tripUpdate = [
                'status' => 'in_transit',
                'actual_start_time' => $trip->actual_start_time ?? now(),
            ];

            if (isset($data['odometer_start_km'])) {
                $tripUpdate['odometer_start_km'] = $data['odometer_start_km'];
            }
            if (! empty($data['container_number'])) {
                $tripUpdate['container_number'] = $data['container_number'];
            }
            if (! empty($data['seal_number'])) {
                $tripUpdate['seal_number'] = $data['seal_number'];
            }

            $trip->update($tripUpdate);

            // Update assigned vehicle status
            if ($trip->vehicle) {
                $trip->vehicle->update(['current_status' => 'dispatched']);
            }
            if ($trip->trailerVehicle) {
                $trip->trailerVehicle->update(['current_status' => 'dispatched']);
            }

            // Update assigned driver status
            if ($trip->driver) {
                $trip->driver->update(['current_status' => 'on_trip']);
            }

            // Advance shipment legs and parent shipments
            foreach ($trip->tripLegs as $tripLeg) {
                $leg = $tripLeg->shipmentLeg;
                if (! $leg) {
                    continue;
                }

                $leg->update([
                    'status' => 'in_transit',
                    'actual_departure' => $leg->actual_departure ?? now(),
                    'vessel_or_flight_or_plate' => $trip->vehicle?->plate_number ?? $leg->vessel_or_flight_or_plate,
                    'voyage_or_trip_number' => $trip->trip_number,
                ]);

                $shipment = $leg->shipment;
                if ($shipment && in_array($shipment->status, ['draft', 'planned'], true)) {
                    $shipment->update([
                        'status' => 'in_transit',
                        'atd' => $shipment->atd ?? now(),
                    ]);

                    $vehiclePlate = $trip->vehicle?->plate_number ?? 'Fleet Truck';
                    $driverName = $trip->driver?->full_name ?? 'Assigned Driver';

                    $shipment->milestones()->create([
                        'organization_id' => $organization->id,
                        'shipment_leg_id' => $leg->id,
                        'code' => 'DEPARTED',
                        'title' => 'Dispatched on Road Run-Sheet',
                        'description' => "Dispatched on trip {$trip->trip_number} with driver {$driverName} [Vehicle: {$vehiclePlate}].",
                        'location_name' => $trip->originLocation?->name ?? 'Origin Hub',
                        'location_id' => $trip->origin_location_id,
                        'occurred_at' => now(),
                        'is_exception' => false,
                        'created_by_user_id' => $context->membership->user_id,
                    ]);
                }
            }

            Audit::record($organization, 'dispatch_trip.dispatched', [
                'dispatch_trip_id' => $trip->id,
                'trip_number' => $trip->trip_number,
                'vehicle' => $trip->vehicle?->plate_number,
                'driver' => $trip->driver?->full_name,
            ]);

            return $trip;
        });
    }

    public function recordProofOfDelivery(OrganizationContext $context, int $tripId, array $data): ProofOfDelivery
    {
        return $this->organizations->mutate($context, 'transport.manage', function (Organization $organization) use ($context, $tripId, $data) {
            $trip = $organization->dispatchTrips()->with(['vehicle', 'driver', 'destinationLocation'])->findOrFail($tripId);
            $shipment = $organization->shipments()->findOrFail($data['shipment_id']);

            $data['organization_id'] = $organization->id;
            $data['dispatch_trip_id'] = $trip->id;
            $data['delivered_at'] = $data['delivered_at'] ?? now();

            $pod = $organization->proofOfDeliveries()->create($data);

            // Complete the associated shipment leg
            $legs = $shipment->legs()->where('destination_location_id', $trip->destination_location_id)->get();
            if ($legs->isEmpty()) {
                $legs = $shipment->legs()->orderByDesc('sequence')->limit(1)->get();
            }
            foreach ($legs as $leg) {
                $leg->update([
                    'status' => 'completed',
                    'actual_arrival' => $leg->actual_arrival ?? now(),
                ]);
            }

            // Advance shipment to delivered
            $shipment->update([
                'status' => 'delivered',
                'ata' => $shipment->ata ?? now(),
            ]);

            // Add official delivery milestone
            $shipment->milestones()->create([
                'organization_id' => $organization->id,
                'code' => 'DELIVERED',
                'title' => 'Delivered & Consignee Signed POD',
                'description' => "Delivered to {$pod->recipient_name}. {$pod->received_packages} packages received in good order. POD signed on {$trip->trip_number}.",
                'location_name' => $trip->destinationLocation?->name ?? 'Destination Hub',
                'location_id' => $trip->destination_location_id,
                'occurred_at' => $pod->delivered_at,
                'is_exception' => ($pod->damaged_packages > 0),
                'created_by_user_id' => $context->membership->user_id,
            ]);

            // Check if trip should be marked completed
            $trip->update([
                'status' => 'completed',
                'actual_end_time' => now(),
            ]);

            // Free vehicle & driver
            if ($trip->vehicle) {
                $trip->vehicle->update(['current_status' => 'available']);
            }
            if ($trip->trailerVehicle) {
                $trip->trailerVehicle->update(['current_status' => 'available']);
            }
            if ($trip->driver) {
                $trip->driver->update(['current_status' => 'available']);
            }

            Audit::record($organization, 'proof_of_delivery.recorded', [
                'proof_of_delivery_id' => $pod->id,
                'dispatch_trip_id' => $trip->id,
                'shipment_id' => $shipment->id,
                'recipient_name' => $pod->recipient_name,
                'received_packages' => $pod->received_packages,
            ]);

            return $pod;
        });
    }

    public function cancelTrip(OrganizationContext $context, int $id, ?string $reason = null): DispatchTrip
    {
        return $this->organizations->mutate($context, 'transport.cancel', function (Organization $organization) use ($id, $reason) {
            $trip = $organization->dispatchTrips()->with(['vehicle', 'trailerVehicle', 'driver'])->findOrFail($id);

            $trip->update([
                'status' => 'cancelled',
                'notes' => trim($trip->notes."\n[Cancelled: ".($reason ?? 'Operational schedule cancelled').']'),
            ]);

            if ($trip->vehicle) {
                $trip->vehicle->update(['current_status' => 'available']);
            }
            if ($trip->trailerVehicle) {
                $trip->trailerVehicle->update(['current_status' => 'available']);
            }
            if ($trip->driver) {
                $trip->driver->update(['current_status' => 'available']);
            }

            Audit::record($organization, 'dispatch_trip.cancelled', [
                'dispatch_trip_id' => $id,
                'trip_number' => $trip->trip_number,
                'reason' => $reason,
            ]);

            return $trip;
        });
    }

    // ------------------------------------------------------------------------
    // Helpers & Foreign Key Validations
    // ------------------------------------------------------------------------

    private function generateTripNumber(?string $custom, Organization $organization): string
    {
        if (! empty($custom)) {
            return $custom;
        }

        $year = now()->year;
        $count = $organization->dispatchTrips()->whereYear('created_at', $year)->count() + 1;

        return sprintf('TRP-%d-%04d', $year, $count);
    }

    private function validateCarrierPartner(Organization $organization, ?int $partnerId): void
    {
        if ($partnerId === null) {
            return;
        }

        if (! $organization->partners()->where('id', $partnerId)->exists()) {
            throw ValidationException::withMessages([
                'carrier_partner_id' => ['The specified carrier partner is invalid or not owned by this organization.'],
            ]);
        }
    }

    private function validateTripForeignEntities(Organization $organization, array $data): void
    {
        if (! empty($data['carrier_partner_id'])) {
            $this->validateCarrierPartner($organization, $data['carrier_partner_id']);
        }

        if (! empty($data['vehicle_id']) && ! $organization->vehicles()->where('id', $data['vehicle_id'])->exists()) {
            throw ValidationException::withMessages([
                'vehicle_id' => ['The selected vehicle does not belong to this organization.'],
            ]);
        }

        if (! empty($data['trailer_vehicle_id']) && ! $organization->vehicles()->where('id', $data['trailer_vehicle_id'])->exists()) {
            throw ValidationException::withMessages([
                'trailer_vehicle_id' => ['The selected trailer does not belong to this organization.'],
            ]);
        }

        if (! empty($data['driver_id']) && ! $organization->drivers()->where('id', $data['driver_id'])->exists()) {
            throw ValidationException::withMessages([
                'driver_id' => ['The selected driver does not belong to this organization.'],
            ]);
        }

        if (! empty($data['secondary_driver_id']) && ! $organization->drivers()->where('id', $data['secondary_driver_id'])->exists()) {
            throw ValidationException::withMessages([
                'secondary_driver_id' => ['The selected secondary driver does not belong to this organization.'],
            ]);
        }

        if (! empty($data['origin_location_id']) && ! $organization->locations()->where('id', $data['origin_location_id'])->exists()) {
            throw ValidationException::withMessages([
                'origin_location_id' => ['The origin location is not recognized for this organization.'],
            ]);
        }

        if (! empty($data['destination_location_id']) && ! $organization->locations()->where('id', $data['destination_location_id'])->exists()) {
            throw ValidationException::withMessages([
                'destination_location_id' => ['The destination location is not recognized for this organization.'],
            ]);
        }
    }

    private function syncTripLegs(Organization $organization, DispatchTrip $trip, array $legIds): void
    {
        $trip->tripLegs()->delete();

        $sequence = 1;
        foreach ($legIds as $legId) {
            $leg = $organization->shipments()->whereHas('legs', fn ($q) => $q->where('id', $legId))->exists();
            if (! $leg) {
                throw ValidationException::withMessages([
                    'shipment_leg_ids' => ["Shipment leg #{$legId} does not belong to this organization."],
                ]);
            }

            $trip->tripLegs()->create([
                'organization_id' => $organization->id,
                'shipment_leg_id' => $legId,
                'sequence' => $sequence++,
            ]);
        }
    }
}
