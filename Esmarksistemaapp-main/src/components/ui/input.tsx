import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm",
        "placeholder:text-slate-400",
        "focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100",
        "hover:border-slate-400 transition-all duration-200",
        "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
