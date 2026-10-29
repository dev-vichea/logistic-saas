import { TripDetail } from "@/components/transport/trip-detail";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ trip: string }>;
}) {
  const { trip } = await params;
  return <TripDetail tripId={parseInt(trip, 10)} />;
}
