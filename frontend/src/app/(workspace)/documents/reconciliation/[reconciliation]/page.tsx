import { ReconciliationStudio } from "@/components/documents/reconciliation-studio";

export default async function ReconciliationDetailPage({
  params,
}: {
  params: Promise<{ reconciliation: string }>;
}) {
  const { reconciliation } = await params;
  return <ReconciliationStudio initialReconciliationId={reconciliation} />;
}
