import { PurchaseOrderDetail } from "@/components/purchase-orders/purchase-order-detail";

export default async function Page({ params }: { params: Promise<{ order: string }> }) {
  const { order } = await params;
  return <PurchaseOrderDetail key={order} id={order} />;
}
