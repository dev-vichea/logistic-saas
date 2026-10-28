import { Suspense } from "react";
import { QuotationList } from "@/components/freight/quotation-list";

export default function Page() {
  return (
    <Suspense>
      <QuotationList />
    </Suspense>
  );
}
