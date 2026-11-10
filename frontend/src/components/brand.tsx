import { Ship } from "lucide-react";
export function Brand({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
        <Ship size={22} />
      </span>
      {!compact && (
        <span className="text-xl font-bold tracking-tight">
          Ship
          <span className={inverse ? "text-blue-200" : "text-primary"}>
            Flow
          </span>
        </span>
      )}
    </div>
  );
}
