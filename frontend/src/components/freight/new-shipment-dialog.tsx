"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type FreightCatalog } from "@/lib/freight";
import { CreateShipmentWorkspace } from "./create-shipment-workspace";

export function NewShipmentDialog({
  catalog,
  onCreated,
}: {
  catalog: FreightCatalog;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 shadow-2xs">
        <Plus size={16} />
        Create Shipment
      </Button>

      {open && (
        <CreateShipmentWorkspace
          open={open}
          onOpenChange={setOpen}
          catalog={catalog}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
