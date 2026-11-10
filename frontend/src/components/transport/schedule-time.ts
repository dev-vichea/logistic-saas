export const dayMs = 24 * 60 * 60 * 1000;
export const weekMs = 7 * dayMs;

export function wallClock(timeZone: string) {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return (date: Date) => {
    const parts = Object.fromEntries(
      format.formatToParts(date).map(({ type, value }) => [type, value]),
    );
    return Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`,
    );
  };
}

export function startOfWeek(localTime: number) {
  const day = Math.floor(localTime / dayMs) * dayMs;
  const daysSinceMonday = (new Date(day).getUTCDay() + 6) % 7;
  return day - daysSinceMonday * dayMs;
}

export function dayKey(localTime: number) {
  return new Date(localTime).toISOString().slice(0, 10);
}

export function weekPosition(localTime: number, week: number) {
  return ((localTime - week) / weekMs) * 100;
}

export function dateTimeInZone(value: string, timezone: string) {
  const local = Date.parse(`${value}Z`);
  if (!Number.isFinite(local)) return null;
  const asWallClock = wallClock(timezone);
  const candidate = local + (local - asWallClock(new Date(local)));
  const instant = candidate + (local - asWallClock(new Date(candidate)));
  return asWallClock(new Date(instant)) === local
    ? new Date(instant).toISOString()
    : null;
}
