import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-normal text-slate-800 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
