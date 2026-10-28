import { Suspense } from "react";
import { ShipmentDetail } from "@/components/freight/shipment-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ shipment: string }>;
}) {
  const { shipment } = await params;
  return (
    <Suspense>
      <ShipmentDetail key={shipment} shipmentId={Number(shipment)} />
    </Suspense>
  );
}
