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
import { freightRoot, type Quotation } from "@/lib/freight";
import { type Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";

export function QuotationList() {
  const { organization, can } = useWorkspace();
  const [search, setSearch] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("q", search.trim());

  const quotationsRes = useResource<Paginated<Quotation>>(
    organization ? `${freightRoot(organization.id)}/quotations?${queryParams.toString()}` : null
  );

  if (!organization) return <NoOrganization />;
  if (quotationsRes.error) return <ErrorBox message={quotationsRes.error} />;

  const quotations = quotationsRes.data?.data || [];

  const handleStatusUpdate = async (id: number, status: string) => {
    if (!organization) return;
    setUpdatingId(id);
    try {
      await api.post(`${freightRoot(organization.id)}/quotations/${id}/status`, { status });
      quotationsRes.reload();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Accepted</Badge>;
      case "sent":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">Sent to Client</Badge>;
      case "rejected":
        return <Badge className="bg-red-50 text-red-800 border-red-200">Rejected</Badge>;
      case "expired":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Expired</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Draft</Badge>;
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="Commercial Pricing"
        title="Freight Quotations"
        description="Multi-currency freight pricing proposals, revision history, and customer approvals."
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotation #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {!quotationsRes.data && !quotationsRes.error ? (
        <Loading />
      ) : quotations.length === 0 ? (
        <Empty
          title="No quotations found"
          description={
            search
              ? "No quotations match your search query."
              : "Quotations generated for customer freight inquiries will appear here with full revision history."
          }
        />
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Quotation # & Revision</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Mode & Incoterm</th>
                  <th className="px-4 py-3.5">Route</th>
                  <th className="px-4 py-3.5">Total Quote Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{q.quotation_number}</span>
                        <span className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                          R{q.revision}
                        </span>
                      </div>
                      {q.valid_until && (
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Valid until: {new Date(q.valid_until).toLocaleDateString()}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 size={14} className="text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{q.customer?.name || "—"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="capitalize text-xs font-medium text-slate-700">
                        {q.transport_mode.replace("_", " ")}
                      </span>
                      {q.incoterm && (
                        <span className="text-xs text-muted-foreground block font-mono">
                          {q.incoterm}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <span>{q.origin_location?.city || "Origin"}</span>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <span>{q.destination_location?.city || "Destination"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-mono font-semibold text-foreground">
                      {q.currency} {Number(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-4">{getStatusBadge(q.status)}</td>

                    <td className="px-5 py-4 text-right">
                      {can("freight.manage") && q.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusUpdate(q.id, "sent")}
                          className="text-xs"
                        >
                          Mark Sent
                        </Button>
                      )}
                      {can("freight.manage") && q.status === "sent" && (
                        <Button
                          size="sm"
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusUpdate(q.id, "accepted")}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Accept
                        </Button>
                      )}
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
