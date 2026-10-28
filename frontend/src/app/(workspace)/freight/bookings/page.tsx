import { Suspense } from "react";
import { BookingList } from "@/components/freight/booking-list";

export default function Page() {
  return (
    <Suspense>
      <BookingList />
    </Suspense>
  );
}
