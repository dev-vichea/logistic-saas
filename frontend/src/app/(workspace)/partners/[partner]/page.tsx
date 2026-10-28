import { PartnerDetail } from "@/components/partners/partner-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ partner: string }>;
}) {
  const { partner } = await params;
  return <PartnerDetail key={partner} id={partner} />;
}
