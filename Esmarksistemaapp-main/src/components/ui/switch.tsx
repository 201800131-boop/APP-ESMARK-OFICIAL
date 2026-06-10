"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "esmark-switch",
        "peer inline-flex h-[22px] w-[42px] shrink-0 items-center overflow-hidden rounded-[14px] border-[2px] border-transparent transition-all duration-300 outline-none",
        "shadow-[inset_0_0_10px_0_rgba(0,0,0,0.25)]",
        "data-[state=unchecked]:bg-gray-300",
        "data-[state=checked]:bg-[#2196F3]",
        "focus-visible:ring-2 focus-visible:ring-[#2196F3]/45 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "esmark-switch-thumb",
          "pointer-events-none block h-[18px] w-[18px] rounded-full bg-white ring-0",
          "transition-transform duration-300 ease-in-out",
          "data-[state=checked]:translate-x-[20px]",
          "data-[state=unchecked]:translate-x-0",
          "shadow-[0_0_10px_3px_rgba(0,0,0,0.25)]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
