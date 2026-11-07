import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 transition-colors outline-none placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
