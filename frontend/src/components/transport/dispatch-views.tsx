"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  ErrorBox,
  Loading,
  NoOrganization,
  PageHeading,
  Pagination,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace";
import {
  transportRoot,
  tripStatusLabels,
  type DispatchTrip,
} from "@/lib/transportation";
import type { Organization, Paginated } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

const views = {
  board: {
    title: "Dispatch Board",
    description:
      "Check assignments, track active runs, and review completed trips.",
  },
  orders: {
    title: "Transport Orders",
    description:
      "Find shipment legs assigned to a run sheet, with their route and assigned equipment.",
  },
  manifests: {
    title: "Manifests",
    description:
      "Open a run sheet’s manifest to review the shipment cargo on its attached legs.",
  },
};

const lanes = [
  {
    id: "draft",
    label: "Draft",
    query: { status: "draft" },
    empty: "No runs waiting for dispatch.",
  },
  {
    id: "active",
    label: "Active",
    query: { stage: "active" },
    empty: "No runs currently in progress.",
  },
  {
    id: "completed",
    label: "Completed",
    query: { status: "completed" },
    empty: "No completed runs yet.",
  },
] as const;

export function DispatchViews({ view }: { view: keyof typeof views }) {
  const { organization, can } = useWorkspace();
  if (!organization) return <NoOrganization />;
  const shipmentView = view === "orders" || view === "manifests";
  if (!can("transport.view") || (shipmentView && !can("freight.view"))) {
    return <ErrorBox message="You do not have access to this dispatch view." />;
  }

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <PageHeading
        {...views[view]}
        action={
          <Button asChild variant="outline" className="h-9">
            <Link href="/transport/trips">
              All trips <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      {view === "board" && (
        <div className="grid items-start gap-4 md:grid-cols-3">
          {lanes.map((lane) => (
            <DispatchLane
              key={lane.id}
              lane={lane}
              organization={organization}
            />
          ))}
        </div>
      )}
      {shipmentView && (
        <DispatchAssignments
          organization={organization}
          manifests={view === "manifests"}
        />
      )}
    </div>
  );
}

function TripLink({ trip }: { trip: DispatchTrip }) {
  return (
    <Link
      href={`/transport/trips/${trip.id}`}
      className="font-semibold break-words text-accent-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {trip.trip_number}
    </Link>
  );
}

function TripRoute({ trip }: { trip: DispatchTrip }) {
  return (
    <p className="text-sm leading-5 break-words">
      {trip.origin_location?.name || "Origin"}
      <ArrowRight
        size={13}
        className="mx-1.5 inline text-muted-foreground"
        aria-hidden="true"
      />
      <span className="sr-only"> to </span>
      {trip.destination_location?.name || "Destination"}
    </p>
  );
}

function TripStatus({ status }: { status: DispatchTrip["status"] }) {
  return (
    <Badge
      variant={
        status === "draft" || status === "cancelled" ? "outline" : "secondary"
      }
    >
      {tripStatusLabels[status]}
    </Badge>
  );
}

function TripTime({
  value,
  timezone,
}: {
  value: string | null;
  timezone: string;
}) {
  if (!value)
    return <span className="text-muted-foreground">Not scheduled</span>;
  return (
    <time dateTime={value} className="tabular-nums">
      {new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(value))}
    </time>
  );
}

function DispatchLane({
  lane,
  organization,
}: {
  lane: (typeof lanes)[number];
  organization: Organization;
}) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({
    ...lane.query,
    page: String(page),
    per_page: "6",
  });
  const { data, error } = useResource<Paginated<DispatchTrip>>(
    `${transportRoot(organization.id)}/trips?${query}`,
  );

  return (
    <section
      aria-labelledby={`dispatch-${lane.id}`}
      className="panel min-w-0 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <h2 id={`dispatch-${lane.id}`} className="text-base font-semibold">
          {lane.label}
        </h2>
        {data && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {data.total}
          </span>
        )}
      </div>
      {error ? (
        <div className="p-4">
          <ErrorBox message={error} />
        </div>
      ) : !data ? (
        <Loading />
      ) : data.data.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{lane.empty}</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {data.data.map((trip) => (
              <li key={trip.id} className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <TripLink trip={trip} />
                  {lane.id === "active" && <TripStatus status={trip.status} />}
                </div>
                <TripRoute trip={trip} />
                <p className="text-xs leading-5 break-words text-muted-foreground">
                  {trip.vehicle?.plate_number || "No vehicle"} ·{" "}
                  {trip.driver?.full_name || "No driver"}
                </p>
                <p className="text-xs text-muted-foreground">
                  <TripTime
                    value={trip.scheduled_start_time}
                    timezone={organization.timezone}
                  />
                </p>
              </li>
            ))}
          </ul>
          {data.last_page > 1 && (
            <div className="border-t px-3 pb-3">
              <Pagination
                page={data.current_page}
                last={data.last_page}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DispatchAssignments({
  organization,
  manifests,
}: {
  organization: Organization;
  manifests: boolean;
}) {
  const [page, setPage] = useState(1);
  const { data, error } = useResource<Paginated<DispatchTrip>>(
    `${transportRoot(organization.id)}/trips?include=legs&per_page=15&page=${page}`,
  );

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  if (data.data.length === 0) {
    return (
      <p className="panel p-6 text-sm text-muted-foreground">
        Trips with attached shipment legs will appear here.
      </p>
    );
  }

  return (
    <section
      aria-label={manifests ? "Trip manifests" : "Assigned shipment legs"}
      className="panel min-w-0"
    >
      <ul className="divide-y divide-border">
        {data.data.map((trip) => (
          <li key={trip.id} className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <TripLink trip={trip} />
                  <TripStatus status={trip.status} />
                </div>
                <TripRoute trip={trip} />
                <p className="text-xs leading-5 text-muted-foreground">
                  {trip.vehicle?.plate_number || "No vehicle"} ·{" "}
                  {trip.driver?.full_name || "No driver"}
                  {trip.carrier_partner && ` · ${trip.carrier_partner.name}`}
                </p>
              </div>
              {manifests && (
                <Button asChild variant="outline" className="h-9">
                  <Link
                    href={`/transport/manifests/${trip.id}`}
                    aria-label={`Open manifest for ${trip.trip_number}`}
                  >
                    Open manifest <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
            {!manifests && (
              <ul className="mt-3 divide-y divide-border rounded-lg bg-muted/40 px-3">
                {trip.trip_legs?.map(({ id, sequence, shipment_leg: leg }) => (
                  <li
                    key={id}
                    className="grid gap-1 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"
                  >
                    <span>
                      <span className="mr-2 text-muted-foreground tabular-nums">
                        {sequence}.
                      </span>
                      {leg?.shipment ? (
                        <Link
                          href={`/freight/shipments/${leg.shipment.id}`}
                          className="font-medium break-words text-accent-foreground hover:underline"
                        >
                          {leg.shipment.shipment_number}
                        </Link>
                      ) : (
                        "Shipment leg"
                      )}
                    </span>
                    <span className="break-words text-muted-foreground">
                      {leg?.origin_location?.name || "Origin"}
                      <ArrowRight
                        size={13}
                        className="mx-1.5 inline"
                        aria-hidden="true"
                      />
                      <span className="sr-only"> to </span>
                      {leg?.destination_location?.name || "Destination"}
                    </span>
                    <span className="capitalize">
                      {leg?.status.replaceAll("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {data.last_page > 1 && (
        <div className="border-t px-4 pb-4">
          <Pagination
            page={data.current_page}
            last={data.last_page}
            onChange={setPage}
          />
        </div>
      )}
    </section>
  );
}
