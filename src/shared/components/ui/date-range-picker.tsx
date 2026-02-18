import * as React from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@shared/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useMediaQuery } from "@shared/hooks/useMediaQuery";

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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Default to today if no value
  const defaultMonth = value?.from || new Date();

  const isPresetActive = (preset: typeof presets[0]) => {
    if (!value?.from || !value?.to) return false;
    const presetRange = preset.value();
    return (
      format(value.from, "yyyy-MM-dd") === format(presetRange.from, "yyyy-MM-dd") &&
      format(value.to, "yyyy-MM-dd") === format(presetRange.to, "yyyy-MM-dd")
    );
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full sm:w-auto min-w-[240px] justify-start text-left font-bold rounded-2xl border-slate-200 shadow-sm transition-all hover:border-secondary/30 hover:bg-slate-50/50",
              !value && "text-muted-foreground",
              value && "text-[#212282] border-secondary/20 bg-secondary/5"
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center mr-3 shadow-xs">
              <CalendarIcon className="h-4 w-4 text-secondary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">Timeframe</span>
              <span className="text-sm leading-none">
                {value?.from ? (
                  value.to ? (
                    <>
                      {format(value.from, "MMM dd")} - {format(value.to, "MMM dd, y")}
                    </>
                  ) : (
                    format(value.from, "MMM dd, y")
                  )
                ) : (
                  "Select Range"
                )}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-100" align="start">
          <div className="flex flex-col md:flex-row max-h-[90vh]">
            {/* Presets sidebar / topbar */}
            <div className={cn(
              "p-3 space-y-1.5 md:min-w-[160px] bg-slate-50/50",
              isDesktop ? "border-r border-slate-100" : "border-b border-slate-100 flex flex-wrap gap-2 space-y-0"
            )}>
              {presets.map((preset) => {
                const active = isPresetActive(preset);
                return (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "justify-start text-xs font-bold transition-all rounded-xl",
                      isDesktop ? "w-full px-3 py-2" : "h-9 px-4",
                      active 
                        ? "bg-secondary text-white hover:bg-secondary hover:text-white shadow-md shadow-secondary/20" 
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                    onClick={() => {
                      onChange(preset.value());
                      setOpen(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
            {/* Calendar */}
            <div className="p-4 bg-white rounded-r-2xl">
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
                numberOfMonths={isDesktop ? 2 : 1}
                autoFocus
                className="rounded-xl border border-slate-50"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type { DateRange };
