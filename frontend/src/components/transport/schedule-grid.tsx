"use client";

import Link from "next/link";
import { Moon, Sun, Sunrise, Truck, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  tripStatusLabels,
  type DispatchTrip,
  type Vehicle,
} from "@/lib/transportation";
import { dayKey, dayMs, wallClock, weekPosition } from "./schedule-time";
import styles from "./schedule-grid.module.css";

const fleetStatusLabels: Record<Vehicle["current_status"], string> = {
  available: "Available",
  dispatched: "Dispatched",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

export type CalendarTrip = Pick<
  DispatchTrip,
  | "id"
  | "trip_number"
  | "status"
  | "scheduled_start_time"
  | "scheduled_end_time"
> & {
  driver?: { id: number; full_name: string } | null;
  origin_location?: { name: string } | null;
  destination_location?: { name: string } | null;
};

export type CalendarVehicle = Pick<
  Vehicle,
  "id" | "plate_number" | "make_model" | "current_status"
> & {
  trips: CalendarTrip[];
};

const periods = [
  { hour: "00", label: "00:00 to 08:00", icon: Sunrise },
  { hour: "08", label: "08:00 to 16:00", icon: Sun },
  { hour: "16", label: "16:00 to 24:00", icon: Moon },
];

const minimumCard = 16;
const trackHeight = 62;

function placeTrips(
  trips: CalendarTrip[],
  week: number,
  getTime: ReturnType<typeof wallClock>,
) {
  const trackEnds: number[] = [];
  const blocks = trips.flatMap((trip) => {
    if (!trip.scheduled_start_time) return [];
    const pickup = getTime(new Date(trip.scheduled_start_time));
    const delivery = trip.scheduled_end_time
      ? getTime(new Date(trip.scheduled_end_time))
      : pickup;
    const start = Math.max(0, weekPosition(pickup, week));
    const end = Math.min(100, Math.max(start, weekPosition(delivery, week)));
    const left = Math.min(start, 100 - minimumCard);
    const right = Math.max(end, left + minimumCard);
    let track = trackEnds.findIndex((trackEnd) => trackEnd <= left);
    if (track === -1) track = trackEnds.length;
    trackEnds[track] = right;
    return [{ trip, track, start, end, left, right }];
  });
  return { blocks, height: Math.max(76, 12 + trackEnds.length * trackHeight) };
}

const dateLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
});

export function ScheduleGrid({
  week,
  now,
  timezone,
  vehicles,
  vehicleTotal,
  unassigned,
  loading,
}: {
  week: number;
  now: number;
  timezone: string;
  vehicles: CalendarVehicle[];
  vehicleTotal: number;
  unassigned: CalendarTrip[];
  loading: boolean;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const today = useRef<HTMLDivElement>(null);
  const fleetHead = useRef<HTMLDivElement>(null);
  const getTime = wallClock(timezone);
  const nowPosition = weekPosition(now, week);
  const days = Array.from({ length: 7 }, (_, index) => week + index * dayMs);
  const todayKey = dayKey(now);
  const tripTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  useEffect(() => {
    const viewport = scroll.current;
    const currentDay = today.current;
    const fleet = fleetHead.current;
    if (
      viewport &&
      currentDay &&
      fleet &&
      currentDay.getBoundingClientRect().right >
        viewport.getBoundingClientRect().right
    ) {
      viewport.scrollLeft +=
        currentDay.getBoundingClientRect().left -
        fleet.getBoundingClientRect().right;
    }
  }, [todayKey, week]);

  function lane(vehicle: CalendarVehicle | null, trips: CalendarTrip[]) {
    const { blocks, height } = placeTrips(trips, week, getTime);
    const drivers = Array.from(
      new Set(
        trips.flatMap(({ driver }) => (driver ? [driver.full_name] : [])),
      ),
    );
    const name = vehicle?.plate_number ?? "Unassigned";
    return (
      <section
        key={vehicle?.id ?? "unassigned"}
        aria-label={name}
        className={styles.row}
      >
        <div
          className={`${styles.fleet} flex flex-col justify-center gap-1 px-3 py-3 sm:px-4`}
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Truck
              size={15}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 break-words">{name}</span>
          </h2>
          {vehicle ? (
            <>
              <p
                className="truncate text-xs text-muted-foreground"
                title={vehicle.make_model}
              >
                {vehicle.make_model}
              </p>
              <p className="flex min-w-0 items-center gap-1.5 text-xs">
                <UserRound
                  size={13}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                />
                <span
                  className="truncate"
                  title={drivers.join(", ") || "No driver scheduled"}
                >
                  {drivers[0] ?? "No driver scheduled"}
                </span>
                {drivers.length > 1 && (
                  <span className="shrink-0 text-muted-foreground">
                    +{drivers.length - 1}
                  </span>
                )}
              </p>
              {vehicle.current_status !== "available" && (
                <p className="text-xs text-muted-foreground">
                  Fleet status: {fleetStatusLabels[vehicle.current_status]}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Trips without a vehicle
            </p>
          )}
        </div>
        <div
          className={styles.timeline}
          data-unassigned={!vehicle}
          style={{ minHeight: height }}
        >
          <div className={styles.dayGrid} aria-hidden="true">
            {days.map((day) => (
              <span
                key={day}
                className={styles.dayCell}
                data-today={dayKey(day) === todayKey}
              />
            ))}
          </div>
          {nowPosition >= 0 && nowPosition < 100 && (
            <span
              className={styles.now}
              style={{ left: `${nowPosition}%` }}
              aria-hidden="true"
            />
          )}
          {blocks.map(({ trip, track, start, end, left, right }) => {
            const pickup = tripTime.format(
              new Date(trip.scheduled_start_time!),
            );
            const delivery = trip.scheduled_end_time
              ? tripTime.format(new Date(trip.scheduled_end_time))
              : "Delivery time unset";
            const destination =
              trip.destination_location?.name ?? "Destination unset";
            const origin =
              trip.origin_location?.name ?? "Pickup location unset";
            const label = `${trip.trip_number}, ${tripStatusLabels[trip.status]}, ${origin} to ${destination}, pickup ${pickup}, ${delivery}`;
            const top = 9 + track * trackHeight;
            return (
              <div key={trip.id}>
                <Link
                  href={`/transport/trips/${trip.id}`}
                  className={styles.trip}
                  data-status={trip.status}
                  style={{
                    left: `calc(${left}% + 3px)`,
                    width: `calc(${right - left}% - 6px)`,
                    top,
                  }}
                  aria-label={label}
                  title={label}
                >
                  <span className="truncate text-xs font-semibold">
                    {trip.trip_number}
                  </span>
                  <span className="truncate text-xs">{destination}</span>
                </Link>
                <span
                  aria-hidden="true"
                  className={styles.span}
                  style={{
                    left: `${start}%`,
                    width: `${end - start}%`,
                    top: top + 52,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div
      className={styles.scroll}
      ref={scroll}
      role="region"
      aria-label="Weekly fleet timeline, scroll for more days"
      tabIndex={0}
      aria-busy={loading}
    >
      <div className={styles.canvas}>
        <div className={`${styles.row} ${styles.header}`}>
          <div
            ref={fleetHead}
            className={`${styles.fleet} flex flex-col justify-center gap-1 px-3 py-2 sm:px-4`}
          >
            <span className="text-sm font-semibold">Fleet</span>
            <span className="text-xs text-muted-foreground">
              {loading
                ? "Loading schedule"
                : `${vehicleTotal} ${vehicleTotal === 1 ? "vehicle" : "vehicles"}`}
            </span>
          </div>
          <div className={styles.headerDays}>
            {days.map((day) => {
              const date = dayKey(day);
              const isToday = date === todayKey;
              return (
                <div
                  key={day}
                  className={styles.dayHeading}
                  data-today={isToday}
                  ref={isToday ? today : undefined}
                >
                  <time
                    dateTime={date}
                    aria-current={isToday ? "date" : undefined}
                    className="block py-2 text-center text-xs font-semibold uppercase"
                  >
                    {dateLabel.format(day)}
                  </time>
                  <div className={styles.periods}>
                    {periods.map(({ hour, label, icon: Icon }) => (
                      <span key={hour} className={styles.period} title={label}>
                        <Icon size={11} aria-hidden="true" />
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {unassigned.length > 0 && lane(null, unassigned)}
        {vehicles.map((vehicle) => lane(vehicle, vehicle.trips))}
      </div>
    </div>
  );
}
