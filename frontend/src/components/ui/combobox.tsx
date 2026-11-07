"use client";

import * as React from "react";
import { ChevronDown, Plus, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  subtext?: string;
  avatarUrl?: string;
  icon?: React.ReactNode;
  statusDot?: "amber" | "green" | "blue" | "red" | "gray";
  statusText?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean | string | null;
  className?: string;

  // Leading Adornment
  leadingAvatarUrl?: string;
  leadingIcon?: React.ReactNode;

  // Trailing Adornment
  statusIndicator?: {
    color?: "amber" | "green" | "blue" | "red" | "gray";
    text: string;
  };
  onQuickAdd?: () => void;
  quickAddTitle?: string;

  // Popover configuration
  emptyMessage?: string;
  allowClear?: boolean;
}

export function Combobox({
  id,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search or type to filter...",
  disabled = false,
  error = false,
  className,
  leadingAvatarUrl,
  leadingIcon,
  statusIndicator,
  onQuickAdd,
  quickAddTitle = "Create new item",
  emptyMessage = "No items found",
  allowClear = false,
}: ComboboxProps) {
  const [internalValue, setInternalValue] = React.useState<string>(
    defaultValue || "",
  );
  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === selectedValue),
    [options, selectedValue],
  );

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(q)),
    );
  }, [options, searchQuery]);

  const closeCombobox = React.useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  // Click outside listener
  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeCombobox();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeCombobox]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
    closeCombobox();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
  };

  const hasError = Boolean(error);

  // Render leading adornment: custom prop or inferred from selected option
  const activeAvatar = leadingAvatarUrl || selectedOption?.avatarUrl;
  const activeIcon = leadingIcon || selectedOption?.icon;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button - Shares exact dimensions, radius, padding & visual styles of TextInput */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
          } else if (e.key === "Escape") {
            closeCombobox();
          }
        }}
        className={cn(
          // Dimensions: h-8, rounded-lg, px-2.5 py-1
          "flex h-8 w-full min-w-0 items-center justify-between rounded-lg px-2.5 py-1 text-sm select-none transition-all duration-150 cursor-pointer outline-none",
          // Visuals: bg-[#f6f7f8], border border-[#eaecf0], shadow-xs
          "bg-[#f6f7f8] dark:bg-slate-900/60 border border-[#eaecf0] dark:border-slate-800 shadow-xs",
          // Typography
          "text-[#020d2d] dark:text-slate-100",
          // Focus Ring
          "focus:border-blue-600 focus:outline-none focus:ring-[3px] focus:ring-blue-100 dark:focus:ring-blue-950/60",
          // Error State
          hasError && "border-[#ff3a3f] ring-3 ring-inset ring-[#ff3a3f]/20 focus:border-[#ff3a3f] focus:ring-[#ff3a3f]/25",
          // Disabled
          disabled && "cursor-not-allowed opacity-50 bg-slate-100 dark:bg-slate-900",
          className,
        )}
      >
        {/* Left Side: Leading Adornment + Label */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {/* Avatar or Category Icon */}
          {activeAvatar && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={activeAvatar}
              alt=""
              className="size-5 rounded-full object-cover shrink-0 mr-0.5 border border-slate-200"
            />
          )}
          {!activeAvatar && activeIcon && (
            <span className="shrink-0 text-[#505966] dark:text-slate-400 mr-0.5 flex items-center">
              {activeIcon}
            </span>
          )}

          {/* Label or Placeholder */}
          {selectedOption ? (
            <span className="truncate font-normal text-[#020d2d] dark:text-slate-100 text-sm">
              {selectedOption.label}
            </span>
          ) : (
            <span className="truncate text-sm text-[#505966] dark:text-slate-500">
              {placeholder}
            </span>
          )}
        </div>

        {/* Right Side: Status Tag/Dot + Clear + Inline Quick Add (+) + Chevron */}
        <div className="flex shrink-0 items-center gap-1.5 ml-2">
          {/* Status Tag / Dot (e.g. amber • Need to set) */}
          {statusIndicator && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium mr-0.5",
                statusIndicator.color === "amber" && "text-amber-600 dark:text-amber-400",
                statusIndicator.color === "green" && "text-[#177c03] dark:text-[#21b204]",
                statusIndicator.color === "blue" && "text-[#0a43e1] dark:text-[#7699f9]",
                statusIndicator.color === "red" && "text-[#ff3a3f]",
                (!statusIndicator.color || statusIndicator.color === "gray") && "text-[#505966]",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              <span>{statusIndicator.text}</span>
            </span>
          )}

          {/* Clear Button */}
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={13} />
            </button>
          )}

          {/* Circular quick-add (+) button */}
          {onQuickAdd && (
            <button
              type="button"
              title={quickAddTitle}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              className="flex size-[18px] items-center justify-center rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-950/80 transition-colors ml-0.5"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          )}

          {/* Dropdown Chevron */}
          <ChevronDown
            size={16}
            className={cn(
              "text-gray-400 transition-transform duration-150 shrink-0",
              isOpen && "rotate-180 text-blue-600",
            )}
          />
        </div>
      </div>

      {/* Dropdown Popover / Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0c1222] p-1 shadow-lg animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Search Header inside popover */}
          <div className="relative mb-1 flex items-center px-1">
            <Search size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-7 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-[#f6f7f8] dark:bg-slate-900/80 pl-7 pr-2 text-xs text-[#020d2d] dark:text-slate-100 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Option Items List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-xs text-gray-500">
                <p>{emptyMessage}</p>
                {onQuickAdd && searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickAdd();
                      setIsOpen(false);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Plus size={12} />
                    <span>Create &quot;{searchQuery}&quot;</span>
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={cn(
                      // Item specification: px-2.5 py-1.5 rounded-md text-sm text-[#020d2d] hover:bg-gray-100 cursor-pointer flex items-center justify-between
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm text-[#020d2d] dark:text-slate-100 transition-colors select-none",
                      opt.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-100 dark:hover:bg-slate-800/80 cursor-pointer",
                      isSelected && "bg-blue-50/70 dark:bg-blue-950/50 font-medium text-blue-900 dark:text-blue-300",
                    )}
                  >
                    {/* Item Left: Avatar / Icon + Text + Subtext */}
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.avatarUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={opt.avatarUrl}
                          alt=""
                          className="size-5 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      )}
                      {!opt.avatarUrl && opt.icon && (
                        <span className="shrink-0 text-gray-400 flex items-center">{opt.icon}</span>
                      )}

                      <div className="min-w-0">
                        <span className="block truncate text-sm leading-tight">{opt.label}</span>
                        {opt.subtext && (
                          <span className="block truncate text-[11px] text-[#6b7789] dark:text-slate-400 leading-tight">
                            {opt.subtext}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Item Right: Status Dot or Checkmark */}
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {opt.statusText && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-medium",
                            opt.statusDot === "amber" && "text-amber-600",
                            opt.statusDot === "green" && "text-[#177c03]",
                            opt.statusDot === "blue" && "text-[#0a43e1]",
                            opt.statusDot === "red" && "text-[#ff3a3f]",
                            (!opt.statusDot || opt.statusDot === "gray") && "text-[#6b7789]",
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>{opt.statusText}</span>
                        </span>
                      )}

                      {isSelected && (
                        <Check size={14} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick-add Footer Action */}
          {onQuickAdd && (
            <div className="mt-1 border-t border-gray-100 dark:border-slate-800/80 pt-1">
              <button
                type="button"
                onClick={() => {
                  onQuickAdd();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>{quickAddTitle}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
