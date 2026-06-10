import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 
          "bg-slate-800 text-white shadow-sm hover:bg-slate-900 active:bg-slate-950 border border-slate-800",
        primary:
          "bg-blue-700 text-white shadow-sm hover:bg-blue-800 active:bg-blue-900 border border-blue-700",
        secondary:
          "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200 active:bg-slate-300 border border-slate-200",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 border border-red-600",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 border border-emerald-600",
        outline:
          "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100",
        ghost:
          "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
        link: 
          "text-blue-700 underline-offset-4 hover:underline hover:text-blue-900",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-7 has-[>svg]:px-5 text-base",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const classNameStr = typeof className === "string" ? className : "";
  const gradientVariants = new Set(["default", "primary", "destructive", "success"]);
  const hasSolidBgOverride = /\bbg-(?!none\b|linear-to-|gradient-to-|gradient\b|clip-|blend-|opacity-|fixed\b|local\b|scroll\b|auto\b|cover\b|contain\b|center\b|top\b|bottom\b|left\b|right\b|repeat\b|no-repeat\b|origin-|position-)[^\s]+/.test(classNameStr);
  const hasExplicitGradient = /\bbg-linear-to-|\bbg-gradient-to-|\bbg-gradient\b/.test(classNameStr);
  const needsBgReset = gradientVariants.has(variant ?? "default") && hasSolidBgOverride && !hasExplicitGradient && !/\bbg-none\b/.test(classNameStr);

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), needsBgReset && "bg-none", className)}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
