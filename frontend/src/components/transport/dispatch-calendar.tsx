"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  LayoutGrid,
  Search,
  Truck,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useState } from "react";
import {
  ErrorBox,
  Loading,
  NoOrganization,
  Pagination,
} from "@/components/common";
import { WorkspaceHeaderSlot } from "@/components/navigation/header-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/workspace";
import {
  transportRoot,
  tripStatusLabels,
  type DispatchTrip,
  type TransportationCatalog,
} from "@/lib/transportation";
import type { Organization, Paginated } from "@/lib/types";
import { useResource } from "@/lib/use-resource";
import { NewTripDialog } from "./new-trip-dialog";
import {
  ScheduleGrid,
  type CalendarTrip,
  type CalendarVehicle,
} from "./schedule-grid";
import { dayKey, dayMs, startOfWeek, wallClock, weekMs } from "./schedule-time";

type CalendarData = {
  vehicles: Paginated<CalendarVehicle>;
  unassigned: Paginated<CalendarTrip>;
  has_trips: boolean;
  latest_start: string | null;
};

const weekLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function DispatchCalendar() {
  const { organization, can } = useWorkspace();
  if (!organization) return <NoOrganization />;
  if (!can("transport.view"))
    return (
      <ErrorBox message="You do not have access to the dispatch schedule." />
    );
  return (
    <Calendar organization={organization} canCreate={can("transport.manage")} />
  );
}

function Calendar({
  organization,
  canCreate,
}: {
  organization: Organization;
  canCreate: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const [week, setWeek] = useState(() =>
    startOfWeek(wallClock(organization.timezone)(new Date())),
  );
  const [mode, setMode] = useState<"calendar" | "unscheduled">("calendar");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const root = transportRoot(organization.id);
  const { data: catalog, error: catalogError } = useResource<{
    data: TransportationCatalog;
  }>(canCreate ? `${root}/catalog` : null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSubmittedSearch(search.trim()),
      220,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const localNow = wallClock(organization.timezone)(now);
  const thisWeek = startOfWeek(localNow);
  const query = new URLSearchParams({ page: String(page) });
  if (submittedSearch) query.set("q", submittedSearch);
  if (status) query.set("status", status);
  const unscheduled = new URLSearchParams(query);
  unscheduled.set("schedule", "unscheduled");
  query.set("week", dayKey(week));
  query.set("unassigned_page", String(unassignedPage));

  function resetPages() {
    setPage(1);
    setUnassignedPage(1);
  }

  function goToWeek(value: number) {
    setWeek(value);
    resetPages();
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <WorkspaceHeaderSlot title="Schedule" icon={CalendarDays} fullWidth />
      <h1 className="sr-only">Dispatch schedule</h1>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-3 py-2.5 sm:px-5">
        <div
          role="group"
          aria-label="Dispatch views"
          className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
        >
          <Button
            type="button"
            variant={mode === "calendar" ? "outline" : "ghost"}
            aria-pressed={mode === "calendar"}
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => {
              setMode("calendar");
              resetPages();
            }}
          >
            <CalendarDays size={15} aria-hidden="true" /> Calendar
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground"
          >
            <Link href="/transport/dispatch-board">
              <LayoutGrid size={15} aria-hidden="true" /> Board
            </Link>
          </Button>
          <Button
            type="button"
            variant={mode === "unscheduled" ? "outline" : "ghost"}
            aria-pressed={mode === "unscheduled"}
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => {
              setMode("unscheduled");
              resetPages();
            }}
          >
            <Clock size={15} aria-hidden="true" /> Unscheduled
          </Button>
        </div>
        <label className="relative min-w-0 flex-1 basis-44 sm:max-w-72">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <span className="sr-only">Search schedule</span>
          <Input
            type="search"
            value={search}
            maxLength={120}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPages();
            }}
            placeholder={
              mode === "calendar"
                ? "Search truck, driver or trip…"
                : "Search trip, driver or truck…"
            }
            className="h-9 pl-9 placeholder:text-muted-foreground"
          />
        </label>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-9 gap-1.5 bg-card text-xs"
          >
            <Link href="/transport/fleet">
              <Truck size={15} aria-hidden="true" /> Fleet
            </Link>
          </Button>
          {catalog ? (
            <NewTripDialog
              catalog={catalog.data}
              onCreated={() => setRefresh((value) => value + 1)}
              triggerLabel="New trip"
            />
          ) : (
            canCreate && (
              <Button asChild className="h-9">
                <Link href="/transport/trips">
                  {catalogError ? "Open trips" : "Trips"}
                </Link>
              </Button>
            )
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-3 py-2.5 sm:px-5">
        {mode === "calendar" && (
          <div className="flex max-w-full items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="bg-card"
              aria-label="Previous week"
              onClick={() => goToWeek(week - weekMs)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <WeekPicker week={week} onChange={goToWeek} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="bg-card"
              aria-label="Next week"
              onClick={() => goToWeek(week + weekMs)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goToWeek(thisWeek)}
              disabled={week === thisWeek}
            >
              This week
            </Button>
          </div>
        )}
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPages();
            }}
            className="h-8 rounded-lg border bg-card px-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="">All trips</option>
            {Object.entries(tripStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span
          className="ml-auto text-xs text-muted-foreground"
          title="Schedule timezone"
        >
          {organization.timezone}
        </span>
      </div>

      {mode === "calendar" ? (
        <CalendarResults
          key={`${query}:${refresh}`}
          url={`${root}/schedule?${query}`}
          week={week}
          now={localNow}
          timezone={organization.timezone}
          onWeek={goToWeek}
          onPage={setPage}
          onUnassignedPage={setUnassignedPage}
        />
      ) : (
        <UnscheduledTrips
          key={`${unscheduled}:${refresh}`}
          url={`${root}/trips?${unscheduled}`}
          onPage={setPage}
        />
      )}
    </div>
  );
}

function WeekPicker({
  week,
  onChange,
}: {
  week: number;
  onChange: (week: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5 bg-card px-2 text-xs tabular-nums sm:px-3"
          aria-label={`Choose week, ${weekLabel.formatRange(week, week + 6 * dayMs)}`}
        >
          <CalendarDays
            size={14}
            aria-hidden="true"
            className="hidden sm:inline"
          />
          {weekLabel.formatRange(week, week + 6 * dayMs)}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={7}
          align="start"
          className="z-50 rounded-xl border bg-popover p-3 text-popover-foreground shadow-md"
        >
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const date = String(new FormData(event.currentTarget).get("day"));
              onChange(startOfWeek(Date.parse(`${date}T00:00:00Z`)));
              setOpen(false);
            }}
          >
            <label className="space-y-1 text-xs font-medium">
              <span>Jump to date</span>
              <Input
                type="date"
                name="day"
                required
                defaultValue={dayKey(week)}
              />
            </label>
            <Button type="submit" className="h-9">
              Go
            </Button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CalendarResults({
  url,
  week,
  now,
  timezone,
  onWeek,
  onPage,
  onUnassignedPage,
}: {
  url: string;
  week: number;
  now: number;
  timezone: string;
  onWeek: (week: number) => void;
  onPage: (page: number) => void;
  onUnassignedPage: (page: number) => void;
}) {
  const { data, error, reload } = useResource<CalendarData>(url);

  return (
    <>
      {error && (
        <div className="shrink-0 p-4">
          <ErrorBox message={error} />
          <Button variant="outline" onClick={reload}>
            Retry schedule
          </Button>
        </div>
      )}
      {data && !data.has_trips && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-blue-50/60 px-4 py-2 text-xs text-muted-foreground sm:px-5">
          <span>No trips match this week.</span>
          {data.latest_start && (
            <button
              type="button"
              className="font-semibold text-accent-foreground underline-offset-4 hover:underline"
              onClick={() =>
                onWeek(
                  startOfWeek(
                    wallClock(timezone)(new Date(data.latest_start!)),
                  ),
                )
              }
            >
              Show latest scheduled week
            </button>
          )}
        </div>
      )}
      <ScheduleGrid
        week={week}
        now={now}
        timezone={timezone}
        vehicles={data?.vehicles.data ?? []}
        vehicleTotal={data?.vehicles.total ?? 0}
        unassigned={data?.unassigned.data ?? []}
        loading={!data && !error}
      />
      {data &&
        (data.vehicles.last_page > 1 || data.unassigned.last_page > 1) && (
          <div className="flex shrink-0 flex-wrap justify-end gap-x-6 border-t bg-card px-4 pb-4">
            {data.vehicles.last_page > 1 && (
              <div className="flex items-end gap-3">
                <span className="mb-1.5 text-xs font-medium">Fleet</span>
                <Pagination
                  page={data.vehicles.current_page}
                  last={data.vehicles.last_page}
                  onChange={onPage}
                />
              </div>
            )}
            {data.unassigned.last_page > 1 && (
              <div className="flex items-end gap-3">
                <span className="mb-1.5 text-xs font-medium">Unassigned</span>
                <Pagination
                  page={data.unassigned.current_page}
                  last={data.unassigned.last_page}
                  onChange={onUnassignedPage}
                />
              </div>
            )}
          </div>
        )}
    </>
  );
}

function UnscheduledTrips({
  url,
  onPage,
}: {
  url: string;
  onPage: (page: number) => void;
}) {
  const { data, error } = useResource<Paginated<DispatchTrip>>(url);
  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">
      {error ? (
        <ErrorBox message={error} />
      ) : !data ? (
        <Loading />
      ) : data.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No unscheduled trips match these filters.
        </p>
      ) : (
        <section className="panel" aria-label="Trips without a pickup time">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ClipboardList
              size={16}
              aria-hidden="true"
              className="text-muted-foreground"
            />
            <h2 className="text-sm font-semibold">
              Trips without a pickup time
            </h2>
          </div>
          <ul className="divide-y">
            {data.data.map((trip) => (
              <li
                key={trip.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/transport/trips/${trip.id}`}
                    className="font-semibold text-accent-foreground underline-offset-4 hover:underline"
                  >
                    {trip.trip_number}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trip.origin_location?.name || "Pickup unset"} to{" "}
                    {trip.destination_location?.name || "Delivery unset"}
                  </p>
                </div>
                <Badge variant="secondary">
                  {tripStatusLabels[trip.status]}
                </Badge>
              </li>
            ))}
          </ul>
          {data.last_page > 1 && (
            <div className="border-t px-4 pb-4">
              <Pagination
                page={data.current_page}
                last={data.last_page}
                onChange={onPage}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
