import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { DestinationPickup } from "@/lib/freight";

export type PickupEvent = {
  code: string;
  title: string;
  containerNumber: string;
};

export function DestinationPickupCard({
  pickup,
  onRecord,
}: {
  pickup: DestinationPickup;
  onRecord?: (event: PickupEvent) => void;
}) {
  const collected = pickup.containers.filter(
    (container) => container.gated_out_at,
  ).length;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Destination pickup</h2>
        <CardDescription aria-live="polite">
          {pickup.containers.length > 0
            ? `${pickup.ready_count} of ${pickup.containers.length} ready for pickup · ${collected} collected`
            : "Add container numbers to the cargo manifest to track pickup."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          <Badge variant={pickup.customs_cleared ? "secondary" : "outline"}>
            {pickup.customs_cleared
              ? "Shipment customs cleared"
              : "Shipment customs clearance pending"}
          </Badge>
        </p>
        {pickup.containers.map((container) => {
          const number = container.container_number;
          const carrier = container.carrier_release_confirmed;
          const terminal = container.terminal_pickup_authorized;
          const status = container.gated_out_at
            ? "Collected"
            : container.ready
              ? "Ready for pickup"
              : "Waiting for clearance or release";
          const carrierAction = carrier
            ? "Withdraw carrier release"
            : "Confirm carrier release";
          const terminalAction = terminal
            ? "Withdraw terminal authorization"
            : "Confirm terminal pickup";

          return (
            <section
              key={number}
              aria-label={`Container ${number}`}
              className="space-y-3 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-mono font-semibold">{number}</h3>
                <Badge variant={container.ready ? "secondary" : "outline"}>
                  {status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={carrier ? "secondary" : "outline"}>
                  {carrier
                    ? "Carrier release confirmed"
                    : "Waiting for carrier release"}
                </Badge>
                <Badge variant={terminal ? "secondary" : "outline"}>
                  {terminal
                    ? "Terminal pickup authorized"
                    : "Waiting for terminal authorization"}
                </Badge>
              </div>
              {container.gated_out_at && (
                <p className="text-muted-foreground">
                  Gate-out recorded{" "}
                  {new Date(container.gated_out_at).toLocaleString()}
                </p>
              )}
              {onRecord && !container.gated_out_at && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onRecord({
                        code: carrier
                          ? "CARRIER_RELEASE_WITHDRAWN"
                          : "CARRIER_RELEASE_CONFIRMED",
                        title: carrierAction,
                        containerNumber: number,
                      })
                    }
                  >
                    {carrierAction}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onRecord({
                        code: terminal
                          ? "TERMINAL_PICKUP_WITHDRAWN"
                          : "TERMINAL_PICKUP_AUTHORIZED",
                        title: terminalAction,
                        containerNumber: number,
                      })
                    }
                  >
                    {terminalAction}
                  </Button>
                  {container.ready && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onRecord({
                          code: "CONTAINER_GATED_OUT",
                          title: "Record gate-out",
                          containerNumber: number,
                        })
                      }
                    >
                      Record gate-out
                    </Button>
                  )}
                </div>
              )}
            </section>
          );
        })}
        {pickup.documents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Shipment documents</h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {pickup.documents.map((document) => (
                <li key={document.id}>
                  <Link
                    className="text-primary underline underline-offset-2"
                    href={`/documents/${document.id}`}
                  >
                    {document.document_type === "bill_of_lading"
                      ? "Bill of Lading"
                      : "Delivery Order"}
                    {document.document_number &&
                      ` · ${document.document_number}`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
