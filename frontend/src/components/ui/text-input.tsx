"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextInputProps
  extends Omit<React.ComponentProps<"input">, "size" | "prefix"> {
  error?: boolean | string | null;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      className,
      type = "text",
      error,
      leadingIcon,
      trailingIcon,
      prefix,
      suffix,
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(error);
    const hasLeading = Boolean(leadingIcon || prefix);
    const hasTrailing = Boolean(trailingIcon || suffix);

    return (
      <div className="relative flex items-center w-full">
        {/* Leading Icon or Prefix */}
        {hasLeading && (
          <div className="pointer-events-none absolute left-2.5 flex items-center text-[#505966] dark:text-slate-400 select-none z-10 text-xs font-medium">
            {leadingIcon && <span className="mr-1.5 flex shrink-0 items-center">{leadingIcon}</span>}
            {prefix && <span>{prefix}</span>}
          </div>
        )}

        {/* Core Input */}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          data-slot="text-input"
          aria-invalid={hasError ? "true" : undefined}
          className={cn(
            // Dimensions & Layout
            "h-8 w-full min-w-0 rounded-lg px-2.5 py-1 text-sm transition-all duration-150 outline-none",
            // Visuals
            "bg-[#f6f7f8] dark:bg-slate-900/60 border border-[#eaecf0] dark:border-slate-800 shadow-xs",
            // Typography
            "text-[#020d2d] dark:text-slate-100 placeholder:text-[#505966] dark:placeholder:text-slate-500",
            // Focus state
            "focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-100 dark:focus-visible:ring-blue-950/60",
            // Error state
            hasError && "border-[#ff3a3f] ring-3 ring-inset ring-[#ff3a3f]/20 focus-visible:border-[#ff3a3f] focus-visible:ring-[#ff3a3f]/25",
            // Disabled state
            disabled && "cursor-not-allowed opacity-50 bg-slate-100 dark:bg-slate-900 border-slate-200",
            // Padding adjustments for adornments
            hasLeading && "pl-8",
            hasTrailing && "pr-8",
            className,
          )}
          {...props}
        />

        {/* Trailing Icon or Suffix */}
        {hasTrailing && (
          <div className="pointer-events-none absolute right-2.5 flex items-center text-[#505966] dark:text-slate-400 select-none z-10 text-xs font-medium">
            {suffix && <span>{suffix}</span>}
            {trailingIcon && <span className="ml-1.5 flex shrink-0 items-center">{trailingIcon}</span>}
          </div>
        )}
      </div>
    );
  },
);

TextInput.displayName = "TextInput";

