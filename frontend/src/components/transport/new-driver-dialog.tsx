"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, User, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { transportRoot, type TransportationCatalog } from "@/lib/transportation";

export function NewDriverDialog({
  catalog,
  onCreated,
}: {
  catalog: TransportationCatalog;
  onCreated?: () => void;
}) {
  const { organization } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    license_number: "",
    license_type: "heavy_truck",
    license_expires_at: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError(null);
    setSaving(true);

    try {
      await api.post(`${transportRoot(organization.id)}/drivers`, {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        license_number: formData.license_number.trim(),
        license_type: formData.license_type,
        license_expires_at: formData.license_expires_at || undefined,
        notes: formData.notes.trim() || undefined,
      });

      setOpen(false);
      if (onCreated) {
        onCreated();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="h-9 gap-1.5 shadow-2xs">
          <Plus size={16} />
          <span>Add Driver</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="default" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold text-xs">
                DRV
              </span>
              <div>
                <SheetTitle>Register Transport Driver</SheetTitle>
                <SheetDescription>
                  Add a company truck driver or subcontracted commercial driver to the dispatch roster.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Identity & Contact */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <User size={15} className="text-blue-900" />
                <span>Driver Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name" className="text-xs font-semibold text-slate-700">
                    Driver Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    required
                    placeholder="e.g. Bunthorn Chea"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Mobile Phone *
                  </Label>
                  <Input
                    id="phone"
                    required
                    placeholder="e.g. +855 12 345 678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="driver@transport.test"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 bg-white text-sm"
                />
              </div>
            </div>

            {/* License & Certification */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <ShieldCheck size={15} className="text-blue-900" />
                <span>Driver License & Certification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="license_number" className="text-xs font-semibold text-slate-700">
                    Driving License Number *
                  </Label>
                  <Input
                    id="license_number"
                    required
                    placeholder="e.g. DL-KH-889921"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="mt-1 bg-white font-mono text-sm uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="license_type" className="text-xs font-semibold text-slate-700">
                    License Classification *
                  </Label>
                  <Select
                    value={formData.license_type}
                    onValueChange={(val) => setFormData({ ...formData, license_type: val })}
                  >
                    <SelectTrigger id="license_type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.driver_license_types.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="license_expires_at" className="text-xs font-semibold text-slate-700">
                  License Expiry Date
                </Label>
                <Input
                  id="license_expires_at"
                  type="date"
                  value={formData.license_expires_at}
                  onChange={(e) => setFormData({ ...formData, license_expires_at: e.target.value })}
                  className="mt-1 bg-white text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <Label htmlFor="driver_notes" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Driver Qualifications & Experience Notes
              </Label>
              <Textarea
                id="driver_notes"
                rows={3}
                placeholder="e.g. Cross-border Bavet & Poipet experience. 10 years heavy articulated trucks."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white text-xs"
              />
            </div>
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs"
            >
              {saving ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
              Register Driver
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
