import { Route } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
        <Route size={22} />
      </span>
      {!compact && (
        <span className="text-xl font-bold tracking-tight">
          mekong<span className="text-primary">.</span>
        </span>
      )}
    </div>
  );
}
