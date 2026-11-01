import { MaterialRequestDetail } from "@/components/material-requests/material-request-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ request: string }>;
}) {
  const { request } = await params;
  return <MaterialRequestDetail key={request} id={request} />;
}
