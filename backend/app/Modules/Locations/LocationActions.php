<?php

namespace App\Modules\Locations;

use App\Modules\Audit\Audit;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Validation\ValidationException;

final class LocationActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function save(OrganizationContext $context, int $partnerId, ?int $id, array $data): Location
    {
        return $this->organizations->mutate($context, 'partners.manage', function (Organization $organization) use ($partnerId, $id, $data) {
            $partner = $organization->partners()->findOrFail($partnerId);
            $partner->ensureActive();
            $location = $id === null ? new Location : $partner->locations()->findOrFail($id);
            $coordinates = array_replace(['latitude' => $location->latitude, 'longitude' => $location->longitude], $data);
            if (($coordinates['latitude'] === null) !== ($coordinates['longitude'] === null)) {
                throw ValidationException::withMessages(['latitude' => 'Provide both latitude and longitude, or leave both empty.', 'longitude' => 'Provide both latitude and longitude, or leave both empty.']);
            }
            if ($data['is_primary'] ?? false) {
                $partner->locations()->where('is_primary', true)->where('id', '<>', $id ?? 0)->update(['is_primary' => false]);
            }
            $location->fill($data);
            $location->organization_id = $organization->id;
            $partner->locations()->save($location);
            Audit::record($organization, $id === null ? 'partner_location.created' : 'partner_location.updated', ['partner_id' => $partnerId, 'location_id' => $location->id, 'fields' => array_keys($data)]);

            return $location->refresh();
        });
    }

    public function delete(OrganizationContext $context, int $partnerId, int $id): void
    {
        $this->organizations->mutate($context, 'partners.manage', function (Organization $organization) use ($partnerId, $id) {
            $partner = $organization->partners()->findOrFail($partnerId);
            $partner->ensureActive();
            $partner->locations()->findOrFail($id)->delete();
            Audit::record($organization, 'partner_location.deleted', ['partner_id' => $partnerId, 'location_id' => $id]);
        });
    }
}
