"use client";

import { useState } from "react";
import {
  Search,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { PageHeading, NoOrganization, Loading, ErrorBox, Empty } from "@/components/common";
import { useResource } from "@/lib/use-resource";
import { freightRoot, type FreightRequest } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function FreightRequestList() {
  const { organization } = useWorkspace();
  const [search, setSearch] = useState<string>("");

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());

  const requestsRes = useResource<Paginated<FreightRequest>>(
    organization ? `${freightRoot(organization.id)}/requests?${queryParams.toString()}` : null
  );

  if (!organization) return <NoOrganization />;
  if (requestsRes.error) return <ErrorBox message={requestsRes.error} />;

  const requests = requestsRes.data?.data || [];

  return (
    <div>
      <PageHeading
        eyebrow="Commercial Intake"
        title="Freight Requests & Inquiries"
        description="Cargo service requests submitted by customers or forwarder commercial representatives."
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search request #, cargo, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {!requestsRes.data && !requestsRes.error ? (
        <Loading />
      ) : requests.length === 0 ? (
        <Empty
          title="No freight requests found"
          description={
            search
              ? "No requests match your search query."
              : "Inbound customer freight inquiries will appear here for quote preparation."
          }
        />
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Request #</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5">Route</th>
                  <th className="px-4 py-3.5">Cargo Specs</th>
                  <th className="px-4 py-3.5">Readiness</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {r.request_number}
                      {r.incoterm && (
                        <span className="text-xs font-mono text-muted-foreground block mt-0.5">
                          {r.incoterm}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 size={14} className="text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{r.customer?.name || "—"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="capitalize text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {r.transport_mode.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <span>{r.origin_location?.city || "Origin"}</span>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <span>{r.destination_location?.city || "Destination"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-xs">
                      <span className="font-medium text-foreground block truncate max-w-[200px]">
                        {r.cargo_description || "General Cargo"}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {r.total_pieces} pcs · {r.total_weight_kg} kg · {r.total_volume_cbm} CBM
                      </span>
                    </td>

                    <td className="px-4 py-4 text-xs text-muted-foreground font-mono">
                      {r.target_readiness_date
                        ? new Date(r.target_readiness_date).toLocaleDateString()
                        : "Flexible"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Badge variant="outline" className="capitalize text-xs">
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
