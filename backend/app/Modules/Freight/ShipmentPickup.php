<?php

namespace App\Modules\Freight;

use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class ShipmentPickup
{
    private const CarrierEvents = [
        'CARRIER_RELEASE_CONFIRMED' => 'Carrier release confirmed',
        'CARRIER_RELEASE_WITHDRAWN' => 'Carrier release withdrawn',
    ];

    private const TerminalEvents = [
        'TERMINAL_PICKUP_AUTHORIZED' => 'Terminal pickup authorized',
        'TERMINAL_PICKUP_WITHDRAWN' => 'Terminal pickup authorization withdrawn',
    ];

    private const GateEvents = ['CONTAINER_GATED_OUT' => 'Container gated out'];

    private const EventTitles = self::CarrierEvents + self::TerminalEvents + self::GateEvents;

    public function summarize(Shipment $shipment, bool $includeDocuments): ?array
    {
        if (! $this->appliesTo($shipment)) {
            return null;
        }

        $shipment->loadMissing(['cargoItems', 'milestones']);
        $events = $shipment->milestones->whereNotNull('container_number')->sortByDesc('id')->groupBy('container_number');
        $containers = $this->containerNumbers($shipment)->map(function (string $number) use ($shipment, $events) {
            $history = $events->get($number, collect());
            $carrier = $this->latest($history, self::CarrierEvents)?->code === 'CARRIER_RELEASE_CONFIRMED';
            $terminal = $this->latest($history, self::TerminalEvents)?->code === 'TERMINAL_PICKUP_AUTHORIZED';
            $gateOut = $this->latest($history, self::GateEvents);

            return [
                'container_number' => $number,
                'carrier_release_confirmed' => $carrier,
                'terminal_pickup_authorized' => $terminal,
                'gated_out_at' => $gateOut?->occurred_at,
                'ready' => $gateOut === null && $carrier && $terminal && $this->customsCleared($shipment),
            ];
        });

        return [
            'customs_cleared' => $this->customsCleared($shipment),
            'ready_count' => $containers->where('ready', true)->count(),
            'containers' => $containers,
            'documents' => $includeDocuments
                ? $shipment->documents()->whereIn('document_type', ['bill_of_lading', 'delivery_order'])
                    ->orderByDesc('id')->get(['id', 'document_type', 'document_number'])
                : [],
        ];
    }

    public function prepareMilestone(Shipment $shipment, array &$data): ?ShipmentMilestone
    {
        $title = self::EventTitles[$data['code']] ?? null;
        if ($title === null) {
            if (isset($data['container_number'])) {
                throw ValidationException::withMessages(['container_number' => 'Select a pickup milestone to record a container event.']);
            }

            return null;
        }

        if (! $this->appliesTo($shipment)) {
            throw ValidationException::withMessages(['code' => 'Destination pickup events apply to active FCL ocean shipments.']);
        }

        $number = strtoupper(trim($data['container_number'] ?? ''));
        if (! $this->containerNumbers($shipment)->containsStrict($number)) {
            throw ValidationException::withMessages(['container_number' => 'Select a container listed on this shipment.']);
        }

        $events = $shipment->milestones()->where('container_number', $number)
            ->reorder('id', 'desc')->get();
        $carrier = $this->latest($events, self::CarrierEvents);
        $terminal = $this->latest($events, self::TerminalEvents);
        $gateOut = $this->latest($events, self::GateEvents);
        $code = $data['code'];
        $current = match (true) {
            isset(self::CarrierEvents[$code]) => $carrier,
            isset(self::TerminalEvents[$code]) => $terminal,
            default => $gateOut,
        };

        if ($current?->code === $code) {
            return $current;
        }

        if ($gateOut !== null) {
            throw ValidationException::withMessages(['code' => 'This container has already gated out.']);
        }

        if (isset(self::GateEvents[$code]) && (! $this->customsCleared($shipment)
            || $carrier?->code !== 'CARRIER_RELEASE_CONFIRMED'
            || $terminal?->code !== 'TERMINAL_PICKUP_AUTHORIZED')) {
            throw ValidationException::withMessages(['code' => 'Confirm customs clearance, carrier release, and terminal pickup before recording gate-out.']);
        }

        $data['container_number'] = $number;
        $data['title'] = $title;
        $data['occurred_at'] = now();

        return null;
    }

    private function appliesTo(Shipment $shipment): bool
    {
        return $shipment->transport_mode === 'ocean_fcl' && $shipment->status !== 'cancelled';
    }

    private function customsCleared(Shipment $shipment): bool
    {
        return in_array($shipment->customs_status, ['cleared', 'released'], true);
    }

    /** @return Collection<int, string> */
    private function containerNumbers(Shipment $shipment): Collection
    {
        return $shipment->cargoItems->pluck('container_number')
            ->map(fn (?string $number) => strtoupper(trim($number ?? '')))
            ->filter(fn (string $number) => $number !== '')
            ->uniqueStrict()->sort()->values();
    }

    private function latest(Collection $events, array $titles): ?ShipmentMilestone
    {
        return $events->first(fn (ShipmentMilestone $event) => isset($titles[$event->code]));
    }
}
