import { Suspense } from "react";
import { PartnerList } from "@/components/partners/partner-list";
export default function Page() {
  return (
    <Suspense>
      <PartnerList contactsMode />
    </Suspense>
  );
}
