"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white rounded-lg border-2 border-gray-300", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm text-gray-900 font-semibold",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "size-8 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-md p-0 text-gray-700 hover:text-gray-900 transition-colors",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell:
          "text-gray-600 rounded-md w-9 font-semibold text-sm",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        ),
        day: cn(
          "size-9 p-0 font-normal text-gray-900 hover:bg-gray-100 rounded-md transition-colors",
          "aria-selected:opacity-100"
        ),
        day_range_start:
          "day-range-start aria-selected:bg-gray-900 aria-selected:text-white",
        day_range_end:
          "day-range-end aria-selected:bg-gray-900 aria-selected:text-white",
        day_selected:
          "bg-gray-900 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-900 focus:text-white font-semibold",
        day_today: "bg-gray-200 text-gray-900 font-semibold",
        day_outside:
          "day-outside text-gray-400 opacity-50 aria-selected:text-gray-400",
        day_disabled: "text-gray-300 opacity-40 line-through",
        day_range_middle:
          "aria-selected:bg-gray-100 aria-selected:text-gray-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
