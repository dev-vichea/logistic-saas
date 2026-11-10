"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ErrorBox,
  Loading,
  NoOrganization,
  PageHeading,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/workspace";
import type { Shipment } from "@/lib/freight";
import { transportRoot, type DispatchTrip } from "@/lib/transportation";
import { useResource } from "@/lib/use-resource";

export function TripManifest({ tripId }: { tripId: number }) {
  const { organization, can } = useWorkspace();
  const allowed = can("transport.view") && can("freight.view");
  const { data, error } = useResource<{ data: DispatchTrip }>(
    organization && allowed
      ? `${transportRoot(organization.id)}/trips/${tripId}?include=manifest`
      : null,
  );

  if (!organization) return <NoOrganization />;
  if (!allowed)
    return <ErrorBox message="You do not have access to shipment manifests." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const trip = data.data;
  const shipments = new Map<number, Shipment>();
  for (const assignment of trip.trip_legs ?? []) {
    const shipment = assignment.shipment_leg?.shipment;
    if (shipment) shipments.set(shipment.id, shipment);
  }

  return (
    <div className="w-full min-w-0 max-w-[calc(100vw-2rem)] sm:max-w-5xl">
      <PageHeading
        title={`Manifest for ${trip.trip_number}`}
        description="Cargo recorded on the attached shipments. A shipment appears once even when this run covers multiple legs."
        action={
          <Button asChild variant="outline" className="h-9">
            <Link href="/transport/manifests">
              <ArrowLeft size={14} aria-hidden="true" /> All manifests
            </Link>
          </Button>
        }
      />
      <section
        className="panel mb-5 px-4 py-4 sm:px-5"
        aria-label="Run sheet summary"
      >
        <Link
          href={`/transport/trips/${trip.id}`}
          className="font-semibold text-accent-foreground underline-offset-4 hover:underline"
        >
          Open run sheet
        </Link>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            ["Pickup", trip.origin_location?.name],
            ["Delivery", trip.destination_location?.name],
            ["Container", trip.container_number],
            ["Seal", trip.seal_number],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-medium break-words">
                {value || "Not recorded"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {shipments.size === 0 && (
        <p className="panel p-5 text-sm text-muted-foreground">
          This run sheet has no attached shipments.
        </p>
      )}
      <div className="space-y-4">
        {Array.from(shipments.values(), (shipment) => (
          <section key={shipment.id} className="panel min-w-0 overflow-hidden">
            <h2 className="border-b bg-muted/40 px-4 py-3 text-base font-semibold">
              <Link
                href={`/freight/shipments/${shipment.id}`}
                className="text-accent-foreground underline-offset-4 hover:underline"
              >
                {shipment.shipment_number}
              </Link>
            </h2>
            {shipment.cargo_items?.length ? (
              <Table
                aria-label={`Cargo for ${shipment.shipment_number}`}
                className="table-fixed sm:table-auto"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-5/12 px-3 sm:w-auto sm:px-4">
                      Cargo
                    </TableHead>
                    <TableHead className="px-2 text-right whitespace-normal sm:px-3">
                      Packages
                    </TableHead>
                    <TableHead className="px-3 text-right whitespace-normal sm:px-4">
                      Gross weight
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.cargo_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-3 py-3 break-words whitespace-normal sm:px-4">
                        {item.description}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-right break-words whitespace-normal tabular-nums sm:px-3">
                        {item.quantity.toLocaleString("en")} {item.package_type}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right whitespace-normal tabular-nums sm:px-4">
                        {Number(item.gross_weight_kg).toLocaleString("en")} kg
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                No cargo lines recorded on this shipment.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
