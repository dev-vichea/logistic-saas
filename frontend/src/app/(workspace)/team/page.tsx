import { Suspense } from "react";
import { Team } from "@/components/team";
export default function Page() {
  return (
    <Suspense>
      <Team />
    </Suspense>
  );
}
