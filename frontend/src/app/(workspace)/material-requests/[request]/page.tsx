import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MaterialRequestDetail } from "@/components/material-requests/material-request-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ request: string }>;
}) {
  const { request } = await params;
  return (
    <div className="space-y-4">
      <Link
        href="/material-requests"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to all material requests
      </Link>
      <MaterialRequestDetail key={request} id={request} />
    </div>
  );
}
