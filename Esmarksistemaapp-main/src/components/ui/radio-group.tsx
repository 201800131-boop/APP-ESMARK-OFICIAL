"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";

import { cn } from "./utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer esmark-radio-item aspect-square size-5 shrink-0 rounded-full border-2 border-slate-300 bg-white text-cyan-600 shadow-sm outline-none transition-all duration-150",
        "data-[state=checked]:border-cyan-600 data-[state=checked]:bg-cyan-50",
        "focus-visible:ring-2 focus-visible:ring-cyan-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 fill-current text-cyan-600" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
