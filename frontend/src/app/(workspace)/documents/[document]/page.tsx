import { DocumentDetail } from "@/components/documents/document-detail";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  return <DocumentDetail documentId={document} />;
}
