import { Suspense } from "react";
import { ShipmentList } from "@/components/freight/shipment-list";

export default function Page() {
  return (
    <Suspense>
      <ShipmentList />
    </Suspense>
  );
}
