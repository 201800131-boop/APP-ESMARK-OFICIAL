"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer esmark-checkbox size-5 shrink-0 rounded-md border-2 border-slate-300 bg-white text-white shadow-sm outline-none transition-all duration-150",
        "data-[state=checked]:border-cyan-600 data-[state=checked]:bg-cyan-600",
        "focus-visible:ring-2 focus-visible:ring-cyan-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
