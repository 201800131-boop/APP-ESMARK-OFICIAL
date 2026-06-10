import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all",
  {
    variants: {
      variant: {
        default:
          "border-gray-300 bg-gray-100 text-gray-800",
        secondary:
          "border-gray-400 bg-gray-200 text-gray-900",
        outline:
          "border-gray-300 bg-white text-gray-700",
        destructive:
          "border-red-300 bg-red-100 text-red-800",
        success:
          "border-green-300 bg-green-100 text-green-800",
        warning:
          "border-yellow-300 bg-yellow-100 text-yellow-800",
        info:
          "border-blue-300 bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span"> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }
>(({ className, variant, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
