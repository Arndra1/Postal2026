import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Renders a native <select> on desktop and a clean bottom-sheet picker on
 * mobile. `options` is an array of { value, label }.
 */
export default function ResponsiveSelect({
  value,
  onChange,
  options,
  className,
  disabled,
  "aria-label": ariaLabel,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? "Select...";

  if (!isMobile) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
          className
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("flex h-10 w-full justify-between font-normal", className)}
        >
          <span className="truncate text-left">{label}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[70vh] safe-pb">
        <DrawerHeader>
          <DrawerTitle>{ariaLabel || "Select an option"}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-4 overscroll-contain max-h-[55vh]">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm text-left transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary/10"
                )}
              >
                <span className="truncate">{o.label}</span>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}