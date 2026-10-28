<?php

namespace App\Modules\Partners;

use App\Modules\Audit\Audit;
use App\Modules\Organizations\Organization;
use App\Modules\Organizations\OrganizationActions;
use App\Modules\Organizations\OrganizationContext;

final class PartnerActions
{
    public function __construct(private OrganizationActions $organizations) {}

    public function create(OrganizationContext $context, array $data): BusinessPartner
    {
        return $this->organizations->mutate($context, 'partners.manage', function (Organization $organization) use ($data) {
            $partner = $organization->partners()->create($data);
            Audit::record($organization, 'partner.created', ['partner_id' => $partner->id]);

            return $partner;
        });
    }

    public function update(OrganizationContext $context, int $id, array $data): BusinessPartner
    {
        return $this->organizations->mutate($context, 'partners.manage', function (Organization $organization) use ($id, $data) {
            $partner = $organization->partners()->findOrFail($id);
            $partner->ensureActive();
            $partner->update($data);
            Audit::record($organization, 'partner.updated', ['partner_id' => $id, 'fields' => array_keys($data)]);

            return $partner;
        });
    }

    public function archive(OrganizationContext $context, int $id, bool $archive): BusinessPartner
    {
        return $this->organizations->mutate($context, 'partners.archive', function (Organization $organization) use ($id, $archive) {
            $partner = $organization->partners()->findOrFail($id);
            if (($partner->archived_at !== null) !== $archive) {
                $partner->archived_at = $archive ? now() : null;
                $partner->save();
                Audit::record($organization, $archive ? 'partner.archived' : 'partner.restored', ['partner_id' => $id]);
            }

            return $partner;
        });
    }

    public function saveContact(OrganizationContext $context, int $partnerId, ?int $id, array $data): PartnerContact
    {
        return $this->organizations->mutate($context, 'partners.manage', function (Organization $organization) use ($partnerId, $id, $data) {
            $partner = $organization->partners()->findOrFail($partnerId);
            $partner->ensureActive();
            $contact = $id === null ? new PartnerContact : $partner->contacts()->findOrFail($id);
            if ($data['is_primary'] ?? false) {
                $partner->contacts()->where('is_primary', true)->where('id', '<>', $id ?? 0)->update(['is_primary' => false]);
            }
            $contact->fill($data);
            $contact->organization_id = $organization->id;
            $partner->contacts()->save($contact);
            Audit::record($organization, $id === null ? 'partner_contact.created' : 'partner_contact.updated', ['partner_id' => $partnerId, 'contact_id' => $contact->id, 'fields' => array_keys($data)]);

            return $contact->refresh();
        });
    }

    public function deleteContact(OrganizationContext $context, int $partnerId, int $id): void
    {
        $this->organizations->mutate($context, 'partners.manage', function (Organization $organization) use ($partnerId, $id) {
            $partner = $organization->partners()->findOrFail($partnerId);
            $partner->ensureActive();
            $partner->contacts()->findOrFail($id)->delete();
            Audit::record($organization, 'partner_contact.deleted', ['partner_id' => $partnerId, 'contact_id' => $id]);
        });
    }
}
