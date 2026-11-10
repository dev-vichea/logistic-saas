import { notFound } from "next/navigation";
import { TripManifest } from "@/components/transport/trip-manifest";

export default async function ManifestPage({
  params,
}: {
  params: Promise<{ trip: string }>;
}) {
  const { trip } = await params;
  const tripId = Number(trip);
  if (!/^\d+$/.test(trip) || !Number.isSafeInteger(tripId) || tripId < 1)
    notFound();
  return <TripManifest tripId={tripId} />;
}
