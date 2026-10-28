import { Suspense } from "react";
import { Departments } from "@/components/departments";
export default function Page() {
  return (
    <Suspense>
      <Departments />
    </Suspense>
  );
}
