import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900",
        "placeholder:text-gray-500",
        "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-500",
        "hover:border-gray-400 transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
        "resize-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
