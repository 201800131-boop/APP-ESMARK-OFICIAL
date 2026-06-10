"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

import { cn } from "./utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group esmark-select-trigger relative flex w-full items-center justify-start gap-2 rounded-md border border-black/10 bg-gradient-to-b from-white to-zinc-50/95 px-3 py-2 pr-10 text-left text-sm font-medium text-slate-900",
        "data-placeholder:text-slate-500",
        "transition-all duration-300 hover:border-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-slate-400/35 focus:ring-offset-2 focus:ring-offset-white focus:border-slate-500",
        "disabled:cursor-not-allowed disabled:opacity-55",
        "data-[size=default]:h-10 data-[size=sm]:h-9",
        "shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.45),0_1.5px_2px_0_rgba(0,0,0,0.06),0_1px_1px_0_rgba(0,0,0,0.04)]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <span
        data-slot="select-indicator"
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 z-20 inline-flex items-center justify-center text-slate-500 opacity-100 transition-transform duration-200 group-data-[state=open]:rotate-180"
      >
        <ChevronDownIcon className="h-4 w-4" />
      </span>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 min-w-[12rem] max-w-[calc(100vw-2rem)] max-h-[min(14rem,60vh)] overflow-x-hidden overflow-y-auto rounded-md border border-black/10 bg-gradient-to-b from-white to-zinc-50/95 text-slate-900 shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.45),0_12px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04)]",
          "data-state=open:animate-in data-state=closed:animate-out",
          "data-state=closed:fade-out-0 data-state=open:fade-in-0",
          "data-state=closed:zoom-out-95 data-state=open:zoom-in-95",
          "data-side=bottom:slide-in-from-top-2 data-side=left:slide-in-from-right-2",
          "data-side=right:slide-in-from-left-2 data-side=top:slide-in-from-bottom-2",
          position === "popper" &&
            "data-side=bottom:translate-y-1 data-side=left:-translate-x-1 data-side=right:translate-x-1 data-side=top:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm font-medium text-slate-900 outline-hidden select-none transition-colors",
        "data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 hover:bg-slate-100",
        "data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-slate-700" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
