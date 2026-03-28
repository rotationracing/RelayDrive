"use client";

import { cn } from "@/lib/utils";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

interface SegmentedSelectorProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedSelector<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedSelectorProps<T>) {
  const optionCount = Math.max(options.length, 1);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segmentWidth = 100 / optionCount;

  return (
    <div
      className={cn(
        "grid h-11 w-full rounded-[var(--radius-lg)] border border-border bg-input p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${optionCount}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-[calc(var(--radius-lg)-6px)] px-3 text-xs font-medium",
              isActive
                ? "border border-[#3b3b43] bg-[#2b2b31] text-foreground"
                : "border border-transparent bg-transparent text-muted-foreground hover:bg-[#202024] hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
