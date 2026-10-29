import { DeclarationDetail } from "@/components/customs/declaration-detail";

export default async function DeclarationDetailPage({
  params,
}: {
  params: Promise<{ declaration: string }>;
}) {
  const { declaration } = await params;
  return <DeclarationDetail declarationId={parseInt(declaration)} />;
}
