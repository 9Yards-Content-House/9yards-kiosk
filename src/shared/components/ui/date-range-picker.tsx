import * as React from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@shared/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

const presets = [
  { label: "Today", value: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Yesterday", value: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: "Last 7 days", value: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 30 days", value: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Last 90 days", value: () => ({ from: startOfDay(subDays(new Date(), 89)), to: endOfDay(new Date()) }) },
  { label: "This month", value: () => {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  }},
  { label: "Last month", value: () => {
    const now = new Date();
    return { 
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1), 
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
    };
  }},
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Default to today if no value
  const defaultMonth = value?.from || new Date();

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="border-r p-2 space-y-1 min-w-[120px]">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    onChange(preset.value());
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={defaultMonth}
                selected={value}
                onSelect={(range) => {
                  onChange(range);
                  if (range?.from && range?.to) {
                    setOpen(false);
                  }
                }}
                numberOfMonths={2}
                autoFocus
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type { DateRange };
