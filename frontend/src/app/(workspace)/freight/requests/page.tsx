import { Suspense } from "react";
import { FreightRequestList } from "@/components/freight/freight-request-list";

export default function Page() {
  return (
    <Suspense>
      <FreightRequestList />
    </Suspense>
  );
}
