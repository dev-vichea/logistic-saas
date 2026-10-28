import { Suspense } from "react";
import { Audit } from "@/components/audit";
export default function Page() {
  return (
    <Suspense>
      <Audit />
    </Suspense>
  );
}
