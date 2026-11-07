"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FieldShellProps {
  id?: string;
  label?: React.ReactNode;
  required?: boolean;
  error?: string | boolean | null;
  errorMessage?: string | null;
  hint?: React.ReactNode;
  labelRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function FieldShell({
  id,
  label,
  required,
  error,
  errorMessage,
  hint,
  labelRight,
  className,
  children,
}: FieldShellProps) {
  const hasError = Boolean(error);
  const resolvedErrorMessage = typeof error === "string" ? error : errorMessage;

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      {/* Label Row (strict 6px gap to input below) */}
      {(label || labelRight) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "text-xs leading-4 font-medium transition-colors select-none",
                hasError
                  ? "text-[#ff3a3f]"
                  : "text-[#505966] dark:text-slate-400",
              )}
            >
              {label}
              {required && <span className="text-[#ff3a3f] ml-0.5">*</span>}
            </label>
          )}

          {labelRight && (
            <div className="text-xs text-[#6b7789] dark:text-slate-500 font-normal">
              {labelRight}
            </div>
          )}
        </div>
      )}

      {/* Input or Control Slot */}
      <div>{children}</div>

      {/* Error Message or Helper Hint */}
      {hasError && resolvedErrorMessage ? (
        <p className="text-xs text-[#ff3a3f] flex items-center gap-1 mt-0.5 leading-tight animate-in fade-in-50 duration-150">
          <span>{resolvedErrorMessage}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-[#6b7789] dark:text-slate-500 leading-tight mt-0.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

