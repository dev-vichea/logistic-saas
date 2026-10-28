import { PartnerEditor } from "@/components/partners/partner-form";
export default async function Page({
  params,
}: {
  params: Promise<{ partner: string }>;
}) {
  const { partner } = await params;
  return <PartnerEditor key={partner} id={partner} />;
}
