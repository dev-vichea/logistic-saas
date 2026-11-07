import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PurchaseOrderDetail } from "@/components/purchase-orders/purchase-order-detail";

export default async function Page({ params }: { params: Promise<{ order: string }> }) {
  const { order } = await params;
  return (
    <div className="space-y-4">
      <Link
        href="/purchase-orders"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to all purchase orders
      </Link>
      <PurchaseOrderDetail key={order} id={order} />
    </div>
  );
}
